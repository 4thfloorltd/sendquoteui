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
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
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
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../../constants/site";
import { AWAITING_STATUS_CHIP_SX } from "../../constants/quoteUi";
import {
  getCustomerEmail,
  getCustomerInitials,
  getCustomerKey,
  getDocumentActivityTime,
} from "../../utils/customerRecords";

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
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let unsubQuotes = () => {};
    let unsubInvoices = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubQuotes();
      unsubInvoices();

      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError("");
      let quotesReady = false;
      let invoicesReady = false;
      const finishLoading = () => {
        if (quotesReady && invoicesReady) setLoading(false);
      };

      unsubQuotes = onSnapshot(
        query(collection(db, "quotes"), where("userId", "==", user.uid)),
        (snapshot) => {
          setQuotes(snapshot.docs
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
        (snapshot) => {
          setInvoices(snapshot.docs
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
    });

    return () => {
      unsubAuth();
      unsubQuotes();
      unsubInvoices();
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

  const allDocuments = useMemo(() => [
    ...customerQuotes.map((document) => ({ document, kind: "quote" })),
    ...customerInvoices.map((document) => ({ document, kind: "invoice" })),
  ].sort((a, b) =>
    getDocumentActivityTime(b.document, b.kind) - getDocumentActivityTime(a.document, a.kind)),
  [customerInvoices, customerQuotes]);

  const customer = useMemo(() => {
    const latest = allDocuments[0]?.document;
    if (!latest) return null;
    return {
      name: String(latest.customerName ?? "").trim() || getCustomerEmail(latest) || "Unnamed customer",
      email: getCustomerEmail(latest),
    };
  }, [allDocuments]);

  const openEdit = () => {
    setNameInput(customer?.name ?? "");
    setEmailInput(customer?.email ?? "");
    setSaveError("");
    setEditOpen(true);
  };

  const handleSave = async () => {
    const name = nameInput.trim();
    const email = emailInput.trim().toLowerCase();
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

  if (loading) {
    return (
      <Box sx={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
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
            <Button
              variant="contained"
              startIcon={<EditOutlinedIcon />}
              onClick={openEdit}
              sx={{ textTransform: "none", bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}
            >
              Edit details
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
            {customerQuotes.length > 0 ? customerQuotes.map((quote) => (
              <DocumentRow key={quote.id} document={quote} kind="quote" />
            )) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderColor: "#E5E7EB" }}>
                <Typography variant="body2" color="text.secondary">No quotes for this customer.</Typography>
              </Paper>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <FontAwesomeIcon icon={faFileInvoice} style={{ color: "#5B21B6" }} />
            <Typography variant="h6" fontWeight={700} color="#083a6b">Invoices</Typography>
          </Box>
          <Stack spacing={1.25}>
            {customerInvoices.length > 0 ? customerInvoices.map((invoice) => (
              <DocumentRow key={invoice.id} document={invoice} kind="invoice" />
            )) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderColor: "#E5E7EB" }}>
                <Typography variant="body2" color="text.secondary">No invoices for this customer.</Typography>
              </Paper>
            )}
          </Stack>
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
    </Box>
  );
}
