import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoice, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../../../firebase";
import SubscribeDialog from "../../components/SubscribeDialog";
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../../constants/site";
import { AWAITING_STATUS_CHIP_SX } from "../../constants/quoteUi";
import { formatPremiumMonthlyDisplay } from "../../helpers/currency";
import {
  getCustomerEmail,
  getCustomerInitials,
  getCustomerKey,
  getDocumentActivityTime,
} from "../../utils/customerRecords";
import { hideCustomerKey } from "../../utils/hiddenCustomers";
import { formatUkPhoneNumber } from "../../helpers/utility";

const toTelHref = (phone) => {
  const cleaned = String(phone ?? "").replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
};

const DOC_PAGE_SIZE = 5;

const quoteStatus = {
  pending: { label: "Pending", sx: AWAITING_STATUS_CHIP_SX },
  accepted: { label: "Accepted", color: "success" },
  declined: { label: "Declined", color: "error" },
};

const invoiceStatus = {
  unpaid: { label: "Unpaid", sx: AWAITING_STATUS_CHIP_SX },
  paid: { label: "Paid", color: "success" },
};

const formatDate = (document, kind) => {
  const value = kind === "invoice" ? document.invoiceDate : document.quoteDate;
  if (!value) return "Date unavailable";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatTotal = (document) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: document.currency ?? "GBP",
      currencyDisplay: "narrowSymbol",
    }).format(Number(document.pricing?.total) || 0);
  } catch {
    return String(Number(document.pricing?.total) || 0);
  }
};

const DocumentRow = ({ document, kind }) => {
  const status = kind === "invoice"
    ? (invoiceStatus[document.status] ?? { label: document.status || "Unknown" })
    : (quoteStatus[document.status] ?? { label: document.status || "Unknown" });
  const prefix = kind === "invoice" ? "INV" : "QU";
  const number = kind === "invoice" ? document.invoiceNumber : document.quoteNumber;
  const path = kind === "invoice"
    ? `/secured/invoice/${document.id}`
    : `/secured/quote/${document.id}`;

  return (
    <Paper
      component={Link}
      to={path}
      elevation={0}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.75,
        border: "1px solid #E5E7EB",
        borderRadius: 2,
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s, box-shadow 0.15s",
        "&:hover": {
          borderColor: "#B8C7D8",
          boxShadow: "0 4px 14px rgba(15,23,42,0.07)",
        },
      }}
    >
      <Avatar
        variant="rounded"
        sx={{
          width: 38,
          height: 38,
          bgcolor: kind === "invoice" ? "#F5F3FF" : "#EFF6FF",
          color: kind === "invoice" ? "#5B21B6" : "#083a6b",
        }}
      >
        <FontAwesomeIcon icon={kind === "invoice" ? faFileInvoice : faPaperPlane} style={{ fontSize: 15 }} />
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={700} color="#083a6b">
          {prefix}-{number ?? "-"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDate(document, kind)} · {formatTotal(document)}
        </Typography>
      </Box>
      <Chip
        label={status.label}
        {...(status.color ? { color: status.color } : {})}
        size="small"
        sx={{ fontWeight: 600, fontSize: "11px", ...status.sx }}
      />
      <ChevronRightIcon sx={{ color: "#94A3B8", flexShrink: 0 }} />
    </Paper>
  );
};

export default function CustomerView() {
  const { customerId = "" } = useParams();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [uid, setUid] = useState(null);
  const [plan, setPlan] = useState("free");
  const [planReady, setPlanReady] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [visibleQuoteCount, setVisibleQuoteCount] = useState(DOC_PAGE_SIZE);
  const [visibleInvoiceCount, setVisibleInvoiceCount] = useState(DOC_PAGE_SIZE);

  const isPremium = plan === "premium";

  useEffect(() => {
    setVisibleQuoteCount(DOC_PAGE_SIZE);
    setVisibleInvoiceCount(DOC_PAGE_SIZE);
  }, [customerId]);

  useEffect(() => {
    let unsubQuotes = () => {};
    let unsubInvoices = () => {};
    let unsubUser = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubQuotes();
      unsubInvoices();
      unsubUser();

      if (!user) {
        setUid(null);
        setPlan("free");
        setPlanReady(true);
        setLoading(false);
        return;
      }

      setUid(user.uid);
      setLoading(true);
      setPlanReady(false);
      setLoadError("");

      unsubUser = onSnapshot(
        doc(db, "users", user.uid),
        (snapshot) => {
          const nextPlan = snapshot.exists() ? (snapshot.data()?.plan ?? "free") : "free";
          setPlan(nextPlan);
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
            (error) => {
              console.error("Customer quote activity error", error);
              setLoadError("Could not load all customer activity.");
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
            (error) => {
              console.error("Customer invoice activity error", error);
              setLoadError("Could not load all customer activity.");
              invoicesReady = true;
              finishLoading();
            },
          );
        },
        (error) => {
          console.error("Customer plan snapshot error", error);
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

  const customerQuotes = useMemo(() =>
    quotes
      .filter((quote) => getCustomerKey(quote) === customerId)
      .sort((a, b) => getDocumentActivityTime(b, "quote") - getDocumentActivityTime(a, "quote")),
  [customerId, quotes]);

  const customerInvoices = useMemo(() =>
    invoices
      .filter((invoice) => getCustomerKey(invoice) === customerId)
      .sort((a, b) => getDocumentActivityTime(b, "invoice") - getDocumentActivityTime(a, "invoice")),
  [customerId, invoices]);

  const displayedQuotes = customerQuotes.slice(0, visibleQuoteCount);
  const displayedInvoices = customerInvoices.slice(0, visibleInvoiceCount);
  const hasMoreQuotes = visibleQuoteCount < customerQuotes.length;
  const hasMoreInvoices = visibleInvoiceCount < customerInvoices.length;

  const allDocuments = useMemo(() => [
    ...customerQuotes.map((document) => ({ document, kind: "quote" })),
    ...customerInvoices.map((document) => ({ document, kind: "invoice" })),
  ].sort((a, b) =>
    getDocumentActivityTime(b.document, b.kind) - getDocumentActivityTime(a.document, a.kind)),
  [customerInvoices, customerQuotes]);

  const customer = useMemo(() => {
    const latest = allDocuments[0]?.document;
    if (!latest) return null;
    const phoneFromLatest = String(latest.customerPhone ?? "").trim();
    const phoneFallback = allDocuments
      .map(({ document }) => String(document.customerPhone ?? "").trim())
      .find(Boolean) ?? "";
    return {
      name: String(latest.customerName ?? "").trim() || getCustomerEmail(latest) || "Unnamed customer",
      email: getCustomerEmail(latest),
      phone: phoneFromLatest || phoneFallback,
    };
  }, [allDocuments]);

  const openEdit = () => {
    setNameInput(customer?.name ?? "");
    setEmailInput(customer?.email ?? "");
    setPhoneInput(customer?.phone ? formatUkPhoneNumber(customer.phone) : "");
    setSaveError("");
    setEditOpen(true);
  };

  const handleSave = async () => {
    const name = nameInput.trim();
    const email = emailInput.trim().toLowerCase();
    const phone = phoneInput.trim();
    if (!name) {
      setSaveError("Customer name is required.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSaveError("Enter a valid email address.");
      return;
    }

    const records = [
      ...customerQuotes.map((document) => ({ collectionName: "quotes", id: document.id })),
      ...customerInvoices.map((document) => ({ collectionName: "invoices", id: document.id })),
    ];

    setSaving(true);
    setSaveError("");
    try {
      for (let index = 0; index < records.length; index += 450) {
        const batch = writeBatch(db);
        records.slice(index, index + 450).forEach((record) => {
          batch.update(doc(db, record.collectionName, record.id), {
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      const newKey = getCustomerKey({ customerName: name, customerEmail: email });
      setEditOpen(false);
      navigate(`/secured/customer/${encodeURIComponent(newKey)}`, { replace: true });
    } catch (error) {
      console.error("Customer details update failed", error);
      setSaveError("Could not update customer details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromCustomers = async () => {
    if (!uid || !customerId) return;
    setRemoving(true);
    setRemoveError("");
    try {
      await hideCustomerKey(uid, customerId);
      setRemoveOpen(false);
      navigate("/secured/customers", { replace: true });
    } catch (error) {
      console.error("Hide customer failed", error);
      setRemoveError("Could not remove this customer. Please try again.");
    } finally {
      setRemoving(false);
    }
  };

  if (!planReady || (isPremium && loading)) {
    return (
      <Box sx={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isPremium) {
    return (
      <Box sx={{ width: "100%", maxWidth: APP_PAGE_CONTENT_MAX_WIDTH, mx: "auto" }}>
        <Button
          component={Link}
          to="/secured/customers"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: "none", mb: 2 }}
        >
          Back to customers
        </Button>
        <Box
          sx={{
            minHeight: 280,
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
            Upgrade to view customer details and activity history.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setSubscribeOpen(true)}
            sx={{ bgcolor: "#083a6b", fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: "#062d52" } }}
          >
            Upgrade to Premium - {formatPremiumMonthlyDisplay()}/mo
          </Button>
        </Box>
        <SubscribeDialog
          open={subscribeOpen}
          onClose={() => setSubscribeOpen(false)}
        />
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box sx={{ width: "100%", maxWidth: APP_PAGE_CONTENT_MAX_WIDTH, mx: "auto" }}>
        <Button component={Link} to="/secured/customers" startIcon={<ArrowBackIcon />} sx={{ textTransform: "none", mb: 2 }}>
          Back to customers
        </Button>
        <Alert severity="error">This customer could not be found.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: APP_PAGE_CONTENT_MAX_WIDTH, mx: "auto", boxSizing: "border-box" }}>
      <Button
        component={Link}
        to="/secured/customers"
        startIcon={<ArrowBackIcon />}
        sx={{ textTransform: "none", color: "#083a6b", mb: 2 }}
      >
        Back to customers
      </Button>

      {loadError ? <Alert severity="warning" sx={{ mb: 2 }}>{loadError}</Alert> : null}

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #E5E7EB",
          borderRadius: 2,
          bgcolor: "#fff",
          p: { xs: 2, sm: 3 },
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, flexWrap: "wrap" }}>
          <Avatar sx={{ width: 58, height: 58, bgcolor: "#E8EEF5", color: "#083a6b", fontWeight: 700, fontSize: "1.1rem" }}>
            {getCustomerInitials(customer.name, customer.email)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" component="h1" fontWeight={700} color="#083a6b">
              {customer.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {customer.email || "No email address"}
            </Typography>
            {customer.phone ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {customer.phone}
              </Typography>
            ) : null}
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
            {customer.email ? (
              <Button
                component="a"
                href={`mailto:${customer.email}`}
                variant="outlined"
                startIcon={<EmailOutlinedIcon />}
                sx={{ textTransform: "none", borderColor: "#CBD5E1", color: "#083a6b" }}
              >
                Email
              </Button>
            ) : null}
            {customer.phone && toTelHref(customer.phone) ? (
              <Button
                component="a"
                href={toTelHref(customer.phone)}
                variant="outlined"
                startIcon={<PhoneOutlinedIcon />}
                sx={{ textTransform: "none", borderColor: "#CBD5E1", color: "#083a6b" }}
              >
                Call
              </Button>
            ) : null}
            <Button
              variant="contained"
              startIcon={<EditOutlinedIcon />}
              onClick={openEdit}
              sx={{ textTransform: "none", bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}
            >
              Edit details
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => {
                setRemoveError("");
                setRemoveOpen(true);
              }}
              sx={{ textTransform: "none" }}
            >
              Remove from customers
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 2.5 }} />
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip label={`${customerQuotes.length} quote${customerQuotes.length === 1 ? "" : "s"}`} sx={{ bgcolor: "#EFF6FF", color: "#083a6b", fontWeight: 600 }} />
          <Chip label={`${customerInvoices.length} invoice${customerInvoices.length === 1 ? "" : "s"}`} sx={{ bgcolor: "#F5F3FF", color: "#5B21B6", fontWeight: 600 }} />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <FontAwesomeIcon icon={faPaperPlane} style={{ color: "#083a6b" }} />
            <Typography variant="h6" fontWeight={700} color="#083a6b">Quotes</Typography>
          </Box>
          <Stack spacing={1.25}>
            {customerQuotes.length > 0 ? displayedQuotes.map((quote) => (
              <DocumentRow key={quote.id} document={quote} kind="quote" />
            )) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderColor: "#E5E7EB" }}>
                <Typography variant="body2" color="text.secondary">No quotes for this customer.</Typography>
              </Paper>
            )}
          </Stack>
          {customerQuotes.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, pt: 2 }}>
              {hasMoreQuotes ? (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setVisibleQuoteCount((count) => count + DOC_PAGE_SIZE)}
                  sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", minWidth: 140 }}
                >
                  Load more
                </Button>
              ) : null}
              <Typography variant="caption" color="text.secondary">
                Showing {Math.min(visibleQuoteCount, customerQuotes.length)} of {customerQuotes.length} quote{customerQuotes.length === 1 ? "" : "s"}
              </Typography>
            </Box>
          ) : null}
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <FontAwesomeIcon icon={faFileInvoice} style={{ color: "#5B21B6" }} />
            <Typography variant="h6" fontWeight={700} color="#083a6b">Invoices</Typography>
          </Box>
          <Stack spacing={1.25}>
            {customerInvoices.length > 0 ? displayedInvoices.map((invoice) => (
              <DocumentRow key={invoice.id} document={invoice} kind="invoice" />
            )) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderColor: "#E5E7EB" }}>
                <Typography variant="body2" color="text.secondary">No invoices for this customer.</Typography>
              </Paper>
            )}
          </Stack>
          {customerInvoices.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, pt: 2 }}>
              {hasMoreInvoices ? (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setVisibleInvoiceCount((count) => count + DOC_PAGE_SIZE)}
                  sx={{ textTransform: "none", fontWeight: 600, borderColor: "#5B21B6", color: "#5B21B6", minWidth: 140 }}
                >
                  Load more
                </Button>
              ) : null}
              <Typography variant="caption" color="text.secondary">
                Showing {Math.min(visibleInvoiceCount, customerInvoices.length)} of {customerInvoices.length} invoice{customerInvoices.length === 1 ? "" : "s"}
              </Typography>
            </Box>
          ) : null}
        </Grid>
      </Grid>

      <Dialog open={editOpen} onClose={() => saving ? null : setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, color: "#083a6b" }}>Edit customer details</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
          <Typography variant="body2" color="text.secondary">
            Changes will be applied to this customer&apos;s existing quotes and invoices.
          </Typography>
          <TextField
            label="Customer name"
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            required
            autoFocus
            disabled={saving}
          />
          <TextField
            label="Email address"
            type="email"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            disabled={saving}
          />
          <TextField
            label="Phone number"
            type="tel"
            value={phoneInput}
            onChange={(event) => setPhoneInput(formatUkPhoneNumber(event.target.value))}
            disabled={saving}
            helperText="Optional"
            slotProps={{ htmlInput: { inputMode: "tel" } }}
          />
          {saveError ? <Alert severity="error">{saveError}</Alert> : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={saving} sx={{ textTransform: "none", color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ textTransform: "none", bgcolor: "#083a6b", minWidth: 120, "&:hover": { bgcolor: "#062d52" } }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={removeOpen} onClose={() => removing ? null : setRemoveOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, color: "#083a6b" }}>Remove from customers?</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "12px !important" }}>
          <Typography variant="body2" color="text.secondary">
            <strong>{customer.name}</strong> will be removed from your Customers list and quote autocomplete.
            Their quotes and invoices are kept for reference.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Creating a new quote or invoice for them will bring them back automatically.
          </Typography>
          {removeError ? <Alert severity="error">{removeError}</Alert> : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRemoveOpen(false)} disabled={removing} sx={{ textTransform: "none", color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveFromCustomers}
            disabled={removing}
            sx={{ textTransform: "none", minWidth: 140 }}
          >
            {removing ? <CircularProgress size={20} color="inherit" /> : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
