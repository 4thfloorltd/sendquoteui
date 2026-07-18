import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoice, faPaperPlane, faUsers } from "@fortawesome/free-solid-svg-icons";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebase";
import SubscribeDialog from "../../components/SubscribeDialog";
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../../constants/site";
import { formatPremiumMonthlyDisplay } from "../../helpers/currency";
import {
  getCustomerEmail,
  getCustomerInitials,
  getCustomerKey,
  getDocumentActivityTime,
  normalizeCustomerValue,
} from "../../utils/customerRecords";

const PAGE_SIZE = 9;

const toTelHref = (phone) => {
  const cleaned = String(phone ?? "").replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
};

const formatActivityDate = (timestamp) => {
  if (!timestamp) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
};

export default function Customers() {
  const navigate = useNavigate();
  const isDesktopNav = useMediaQuery("(min-width:769px)");
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [hiddenCustomerKeys, setHiddenCustomerKeys] = useState([]);
  const [plan, setPlan] = useState("free");
  const [planReady, setPlanReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const isPremium = plan === "premium";

  useEffect(() => {
    let unsubQuotes = () => {};
    let unsubInvoices = () => {};
    let unsubUser = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubQuotes();
      unsubInvoices();
      unsubUser();

      if (!user) {
        setQuotes([]);
        setInvoices([]);
        setHiddenCustomerKeys([]);
        setPlan("free");
        setPlanReady(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setPlanReady(false);
      setError("");

      unsubUser = onSnapshot(
        doc(db, "users", user.uid),
        (snapshot) => {
          const data = snapshot.exists() ? snapshot.data() : {};
          const nextPlan = data?.plan ?? "free";
          const keys = data?.hiddenCustomerKeys ?? [];
          setPlan(nextPlan);
          setHiddenCustomerKeys(Array.isArray(keys) ? keys : []);
          setPlanReady(true);

          unsubQuotes();
          unsubInvoices();
          unsubQuotes = () => {};
          unsubInvoices = () => {};

          if (nextPlan !== "premium") {
            setQuotes([]);
            setInvoices([]);
            setLoading(false);
            return;
          }

          setLoading(true);
          let quotesReady = false;
          let invoicesReady = false;
          const finishLoading = () => {
            if (quotesReady && invoicesReady) setLoading(false);
          };

          unsubQuotes = onSnapshot(
            query(collection(db, "quotes"), where("userId", "==", user.uid)),
            (quotesSnap) => {
              setQuotes(quotesSnap.docs
                .map((item) => ({ id: item.id, ...item.data() }))
                .filter((item) => !item.deleted));
              quotesReady = true;
              finishLoading();
            },
            (snapshotError) => {
              console.error("Customers quotes snapshot error", snapshotError);
              setError("Some customer activity could not be loaded.");
              quotesReady = true;
              finishLoading();
            },
          );

          unsubInvoices = onSnapshot(
            query(collection(db, "invoices"), where("userId", "==", user.uid)),
            (invoicesSnap) => {
              setInvoices(invoicesSnap.docs
                .map((item) => ({ id: item.id, ...item.data() }))
                .filter((item) => !item.deleted));
              invoicesReady = true;
              finishLoading();
            },
            (snapshotError) => {
              console.error("Customers invoices snapshot error", snapshotError);
              setError("Some customer activity could not be loaded.");
              invoicesReady = true;
              finishLoading();
            },
          );
        },
        (snapshotError) => {
          console.error("Customers user profile snapshot error", snapshotError);
          setHiddenCustomerKeys([]);
          setPlan("free");
          setPlanReady(true);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubAuth();
      unsubQuotes();
      unsubInvoices();
      unsubUser();
    };
  }, []);

  const hiddenKeySet = useMemo(
    () => new Set(hiddenCustomerKeys.map((key) => String(key))),
    [hiddenCustomerKeys],
  );

  const customers = useMemo(() => {
    const byCustomer = new Map();

    const addDocument = (document, kind) => {
      const key = getCustomerKey(document);
      if (!key || hiddenKeySet.has(key)) return;

      const email = getCustomerEmail(document);
      const name = String(document.customerName ?? "").trim();
      const phone = String(document.customerPhone ?? "").trim();
      const timestamp = getDocumentActivityTime(document, kind);
      const current = byCustomer.get(key) ?? {
        key,
        name: name || email || "Unnamed customer",
        email,
        phone: "",
        quoteCount: 0,
        invoiceCount: 0,
        lastActivity: 0,
        lastDocumentKind: kind,
      };

      if (name) current.name = name;
      if (email) current.email = email;
      if (phone) current.phone = phone;
      if (kind === "quote") current.quoteCount += 1;
      if (kind === "invoice") current.invoiceCount += 1;
      if (timestamp >= current.lastActivity) {
        current.lastActivity = timestamp;
        current.lastDocumentKind = kind;
        if (phone) current.phone = phone;
      }
      byCustomer.set(key, current);
    };

    quotes.forEach((quote) => addDocument(quote, "quote"));
    invoices.forEach((invoice) => addDocument(invoice, "invoice"));

    return [...byCustomer.values()].sort((a, b) =>
      b.lastActivity - a.lastActivity || a.name.localeCompare(b.name));
  }, [hiddenKeySet, invoices, quotes]);

  const normalizedSearch = normalizeCustomerValue(searchQuery);
  const filteredCustomers = customers.filter((customer) =>
    !normalizedSearch
    || normalizeCustomerValue(customer.name).includes(normalizedSearch)
    || normalizeCustomerValue(customer.email).includes(normalizedSearch)
    || normalizeCustomerValue(customer.phone).includes(normalizedSearch));
  const displayedCustomers = filteredCustomers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCustomers.length;

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: APP_PAGE_CONTENT_MAX_WIDTH,
        mx: "auto",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: isDesktopNav ? "row" : "column",
          justifyContent: "space-between",
          alignItems: isDesktopNav ? "flex-start" : "stretch",
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <FontAwesomeIcon icon={faUsers} style={{ color: "#083a6b", fontSize: "1.25rem" }} />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "#083a6b" }}>
              Customers
            </Typography>
            {!isPremium && planReady ? (
              <Chip
                icon={<LockOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                label="Premium"
                size="small"
                sx={{
                  height: 22,
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  bgcolor: "#083a6b",
                  color: "#fff",
                  "& .MuiChip-icon": { color: "#fff" },
                }}
              />
            ) : null}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Recent customers from your quotes and invoices.
          </Typography>
        </Box>

        {isPremium ? (
        <TextField
          size="small"
          placeholder="Search customers…"
          value={searchQuery}
          onChange={handleSearchChange}
          sx={{ width: isDesktopNav ? 340 : "100%" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: "#9CA3AF" }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchQuery("");
                    setVisibleCount(PAGE_SIZE);
                  }}
                  aria-label="Clear customer search"
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        ) : null}
      </Box>

      {!planReady || (isPremium && loading) ? (
        <Box sx={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : !isPremium ? (
        <Box
          sx={{
            minHeight: 320,
            border: "1px solid #E5E7EB",
            borderRadius: 2,
            bgcolor: "#F8FAFC",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            px: 3,
            py: 4,
          }}
        >
          <Avatar sx={{ width: 56, height: 56, bgcolor: "#E8EEF5", color: "#083a6b", mb: 2 }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography fontWeight={700} color="#083a6b" sx={{ mb: 0.5 }}>
            Customers is a Premium feature
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mb: 2.5 }}>
            See everyone you&apos;ve quoted or invoiced in one place, with contact details and recent activity.
            Upgrade to unlock the customer list.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setSubscribeOpen(true)}
            sx={{ bgcolor: "#083a6b", fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: "#062d52" } }}
          >
            Upgrade to Premium - {formatPremiumMonthlyDisplay()}/mo
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => navigate("/secured/billing", { state: { scrollToPremium: true } })}
            sx={{ mt: 1, color: "#6B7280", fontWeight: 600, textTransform: "none" }}
          >
            Compare plans
          </Button>
        </Box>
      ) : (
        <>
      {error ? <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert> : null}

      {customers.length === 0 ? (
        <Box
          sx={{
            minHeight: 320,
            border: "1px solid #E5E7EB",
            borderRadius: 2,
            bgcolor: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            px: 3,
          }}
        >
          <Avatar sx={{ width: 56, height: 56, bgcolor: "#E8EEF5", color: "#083a6b", mb: 2 }}>
            <FontAwesomeIcon icon={faUsers} />
          </Avatar>
          <Typography fontWeight={700} color="#083a6b">No customers yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 420 }}>
            Customers will appear here after you create a quote or invoice for them.
          </Typography>
        </Box>
      ) : filteredCustomers.length === 0 ? (
        <Box sx={{ border: "1px solid #E5E7EB", borderRadius: 2, bgcolor: "#fff", p: 5, textAlign: "center" }}>
          <Typography color="text.secondary">No customers found for “{searchQuery}”.</Typography>
          <Button
            variant="outlined"
            onClick={() => setSearchQuery("")}
            sx={{ mt: 2, textTransform: "none", borderColor: "#083a6b", color: "#083a6b" }}
          >
            Clear search
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {displayedCustomers.map((customer) => (
              <Grid item xs={12} sm={6} md={4} key={customer.key}>
                <Card
                  variant="outlined"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/secured/customer/${encodeURIComponent(customer.key)}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/secured/customer/${encodeURIComponent(customer.key)}`);
                    }
                  }}
                  sx={{
                    height: "100%",
                    cursor: "pointer",
                    borderColor: "#E5E7EB",
                    borderRadius: 2,
                    boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 24px rgba(15,23,42,0.09)",
                      borderColor: "#B8C7D8",
                    },
                  }}
                >
                  <CardContent sx={{ height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                      <Avatar sx={{ width: 46, height: 46, bgcolor: "#E8EEF5", color: "#083a6b", fontWeight: 700 }}>
                        {getCustomerInitials(customer.name, customer.email)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography fontWeight={700} color="#111827" noWrap>
                          {customer.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {customer.email || "No email address"}
                        </Typography>
                        {customer.phone ? (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            {customer.phone}
                          </Typography>
                        ) : null}
                      </Box>
                      <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                        {customer.email ? (
                          <IconButton
                            component="a"
                            href={`mailto:${customer.email}`}
                            size="small"
                            aria-label={`Email ${customer.name}`}
                            onClick={(event) => event.stopPropagation()}
                            sx={{ color: "#083a6b", bgcolor: "#F0F4F8", "&:hover": { bgcolor: "#E2E8F0" } }}
                          >
                            <EmailOutlinedIcon fontSize="small" />
                          </IconButton>
                        ) : null}
                        {customer.phone && toTelHref(customer.phone) ? (
                          <IconButton
                            component="a"
                            href={toTelHref(customer.phone)}
                            size="small"
                            aria-label={`Call ${customer.name}`}
                            onClick={(event) => event.stopPropagation()}
                            sx={{ color: "#083a6b", bgcolor: "#F0F4F8", "&:hover": { bgcolor: "#E2E8F0" } }}
                          >
                            <PhoneOutlinedIcon fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2.5 }}>
                      {customer.quoteCount > 0 ? (
                        <Chip
                          icon={<FontAwesomeIcon icon={faPaperPlane} style={{ fontSize: 11 }} />}
                          label={`${customer.quoteCount} quote${customer.quoteCount === 1 ? "" : "s"}`}
                          size="small"
                          sx={{ bgcolor: "#EFF6FF", color: "#083a6b", fontWeight: 600 }}
                        />
                      ) : null}
                      {customer.invoiceCount > 0 ? (
                        <Chip
                          icon={<FontAwesomeIcon icon={faFileInvoice} style={{ fontSize: 11 }} />}
                          label={`${customer.invoiceCount} invoice${customer.invoiceCount === 1 ? "" : "s"}`}
                          size="small"
                          sx={{ bgcolor: "#F5F3FF", color: "#5B21B6", fontWeight: 600 }}
                        />
                      ) : null}
                    </Box>

                    <Box sx={{ mt: "auto", pt: 2.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Last activity · {formatActivityDate(customer.lastActivity)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, pt: 3 }}>
            {hasMore ? (
              <Button
                variant="outlined"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", minWidth: 160 }}
              >
                Load more
              </Button>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              Showing {Math.min(visibleCount, filteredCustomers.length)} of {filteredCustomers.length} customer{filteredCustomers.length === 1 ? "" : "s"}
            </Typography>
          </Box>
        </>
      )}
        </>
      )}

      <SubscribeDialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />
    </Box>
  );
}
