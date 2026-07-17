import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { siVisa, siMastercard, siAmericanexpress, siApplepay, siGooglepay, siStripe } from "simple-icons";
import { buildQuotePdfDocument } from "../utils/buildQuotePdfDocument";
import { formatDateLong, createFormatMoney } from "../utils/quoteDisplay";
import QuoteShareQuickButtons from "../components/QuoteShareQuickButtons";
import InvoicePayDialog from "../components/InvoicePayDialog";
import { getCustomerKey } from "../utils/customerRecords";
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../constants/site";
import {
  AWAITING_STATUS_CHIP_SX,
  SECURED_BACK_TO_INVOICES_BUTTON_SX,
} from "../constants/quoteUi";

const isMobileDevice = () =>
  typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

/** Renders an official simple-icons brand SVG inside a card-style badge chip. */
const BrandBadge = ({ icon, bgColor = "#fff", fgColor }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid #E5E7EB",
      borderRadius: "5px",
      p: "5px",
      bgcolor: bgColor,
      flexShrink: 0,
    }}
  >
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill={fgColor ?? `#${icon.hex}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={icon.title}
    >
      <path d={icon.path} />
    </svg>
  </Box>
);

/** Touch-friendly 48px row height; normalizes Link-as-button with outlined siblings. */
const SMALL_OUTLINED_ACTION_PADDING_SX = {
  height: 48,
  boxSizing: "border-box",
  px: "16px",
  py: 0,
};

const InvoiceView = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isSecured = /^\/secured\/invoice\/[^/]+$/.test(location.pathname);
  const isOwner = !!auth.currentUser;

  const [isPremium, setIsPremium] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteWorking, setDeleteWorking] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const pdfBlobUrlRef = useRef(null);
  const [invoicePayError, setInvoicePayError] = useState("");
  const [paymentReturnBanner, setPaymentReturnBanner] = useState(null);
  const [invoicePayOpen, setInvoicePayOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Handle Stripe payment return redirects
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const p = q.get("payment");
    const redirectStatus = q.get("redirect_status");
    const pi = q.get("payment_intent");

    if (p === "success") {
      setPaymentReturnBanner("success");
      navigate({ pathname: location.pathname, search: "" }, { replace: true });
      return;
    }
    if (p === "cancel") {
      setPaymentReturnBanner("cancel");
      navigate({ pathname: location.pathname, search: "" }, { replace: true });
      return;
    }
    if (redirectStatus && pi) {
      const next = new URLSearchParams(location.search);
      next.delete("payment_intent");
      next.delete("payment_intent_client_secret");
      next.delete("redirect_status");
      const s = next.toString();
      navigate({ pathname: location.pathname, search: s ? `?${s}` : "" }, { replace: true });
      if (redirectStatus === "succeeded") {
        setPaymentReturnBanner("success");
      } else if (redirectStatus === "failed") {
        setInvoicePayError("Your bank did not authorise this payment.");
      }
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    let cancelled = false;
    const pdfGenerated = { current: false };
    let firestoreUnsub = () => {};

    const subscribeFirestore = () => {
      firestoreUnsub();
      firestoreUnsub = onSnapshot(
        doc(db, "invoices", invoiceId),
        (snap) => {
          if (cancelled) return;
          if (!snap.exists()) {
            setError("This invoice could not be found.");
            setLoading(false);
            return;
          }
          const data = snap.data();
          setInvoice(data);
          setError("");

          if (!pdfGenerated.current) {
            pdfGenerated.current = true;
            try {
              const formatMoney = createFormatMoney(data.currency);
              const pdfDoc = buildQuotePdfDocument({
                quoteData: {
                  quoteNumber: data.invoiceNumber,
                  quoteDate: data.invoiceDate,
                  businessName: data.businessName,
                  businessEmail: data.businessEmail,
                  businessAddress: data.businessAddress,
                  customerName: data.customerName,
                  email: data.customerEmail,
                  currency: data.currency,
                  bankName: data.bankName,
                  bankAccountNumber: data.bankAccountNumber,
                  bankSortCode: data.bankSortCode,
                },
                lineItems: data.lineItems ?? [],
                pricing: data.pricing ?? { subtotal: 0, tax: 0, total: 0 },
                formatMoney,
                formatDateLong,
                vatRegistered: data.vatRegistered ?? true,
                documentKind: "invoice",
              });
              const blob = pdfDoc.output("blob");
              const url = URL.createObjectURL(blob);
              pdfBlobUrlRef.current = url;
              if (!cancelled) setPdfBlobUrl(url);
            } catch (pdfErr) {
              console.warn("PDF generation failed in InvoiceView", pdfErr);
            }
          }
          setLoading(false);
        },
        (e) => {
          if (!cancelled) {
            console.error("InvoiceView snapshot error", e);
            const code = String(e?.code ?? "");
            const msg = String(e?.message ?? "");
            const isPermission =
              code === "permission-denied"
              || code.endsWith("/permission-denied")
              || /permission|insufficient|PERMISSION_DENIED/i.test(msg);
            setError(
              isPermission
                ? "Cannot read this invoice (permission denied). In Firestore → Rules, add an `invoices` block with `allow read: if true;` (same as your `quotes`) plus owner `create`/`update` — see `firestore.invoices.rules.snippet`. Also confirm the project in `.env` matches where you edited rules, and the invoice doc has `userId`."
                : "Could not load this invoice. Please try again later.",
            );
            setLoading(false);
          }
        },
      );
    };

    let authUnsub = () => {};
    if (isSecured) {
      authUnsub = onAuthStateChanged(auth, (user) => {
        if (cancelled) return;
        if (!user) { setLoading(true); return; }
        getDoc(doc(db, "users", user.uid))
          .then((s) => { if (!cancelled) setIsPremium(s.data()?.plan === "premium"); })
          .catch(() => {});
        subscribeFirestore();
      });
    } else {
      if (auth.currentUser) {
        getDoc(doc(db, "users", auth.currentUser.uid))
          .then((s) => { if (!cancelled) setIsPremium(s.data()?.plan === "premium"); })
          .catch(() => {});
      }
      subscribeFirestore();
    }

    return () => {
      cancelled = true;
      authUnsub();
      firestoreUnsub();
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = null;
      }
    };
  }, [invoiceId, isSecured]);

  const handleMarkPaid = async () => {
    try {
      await updateDoc(doc(db, "invoices", invoiceId), {
        status: "paid",
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Mark paid failed", e);
    }
  };

  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    setDeleteWorking(true);
    try {
      await updateDoc(doc(db, "invoices", invoiceId), {
        deleted: true,
        deletedAt: serverTimestamp(),
      });
      navigate("/secured/invoices");
    } catch (e) {
      console.error("Delete failed", e);
      setDeleteWorking(false);
      setDeleteDialogOpen(true);
    }
  };

  const backButton = (
    <Button
      component={Link}
      to="/secured/invoices"
      variant="text"
      color="inherit"
      startIcon={<ArrowBackIcon />}
      sx={SECURED_BACK_TO_INVOICES_BUTTON_SX}
    >
      Back to invoices
    </Button>
  );

  if (loading) {
    return (
      <Box sx={{ maxWidth: APP_PAGE_CONTENT_MAX_WIDTH, mx: "auto", width: "100%", boxSizing: "border-box", px: isSecured ? 0 : { xs: 2, sm: 3 } }}>
        {isSecured ? backButton : null}
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: isSecured ? APP_PAGE_CONTENT_MAX_WIDTH : 500, mx: "auto", width: isSecured ? "100%" : undefined, boxSizing: "border-box", px: isSecured ? 0 : 2, py: 6, pt: isSecured ? 0 : 6 }}>
        {isSecured ? backButton : null}
        <Alert severity="error" sx={{ alignItems: "center" }}>{error}</Alert>
      </Box>
    );
  }

  if (deleteWorking) {
    return (
      <Box sx={{ maxWidth: isSecured ? APP_PAGE_CONTENT_MAX_WIDTH : 500, mx: "auto", width: isSecured ? "100%" : undefined, boxSizing: "border-box", px: isSecured ? 0 : 2, py: isSecured ? 4 : 6, pt: isSecured ? 0 : 6 }}>
        {isSecured ? backButton : null}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, py: { xs: 6, sm: 8 }, textAlign: "center" }}>
          <CircularProgress size={40} />
          <Typography variant="body1" fontWeight={600} color="text.primary">
            Deleting invoice…
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
            Hang on while we remove this invoice and update your list.
          </Typography>
        </Box>
      </Box>
    );
  }

  if (invoice?.deleted) {
    return (
      <Box sx={{ maxWidth: isSecured ? APP_PAGE_CONTENT_MAX_WIDTH : 500, mx: "auto", width: isSecured ? "100%" : undefined, boxSizing: "border-box", px: isSecured ? 0 : 2, py: isSecured ? 4 : 10, pt: isSecured ? 0 : 10, textAlign: "center" }}>
        {isSecured ? <Box sx={{ textAlign: "left" }}>{backButton}</Box> : null}
        <Typography variant="h6" fontWeight={700} color="#083a6b" sx={{ mb: 1 }}>Invoice no longer available</Typography>
        <Typography color="text.secondary">This invoice has been removed by the sender.</Typography>
      </Box>
    );
  }

  const formatMoney = createFormatMoney(invoice.currency);
  const pricing = invoice.pricing ?? { subtotal: 0, tax: 0, total: 0 };
  const vatRegistered = invoice.vatRegistered ?? true;
  const isMobile = isMobileDevice();
  const displayNumber = invoice.invoiceNumber ?? "-";

  const statusChipProps =
    ({
      unpaid: { label: "Unpaid", sx: AWAITING_STATUS_CHIP_SX },
      paid: { label: "Paid", color: "success" },
    }[invoice.status] ?? { label: String(invoice.status ?? ""), color: "default" });

  return (
    <Box
      sx={{
        maxWidth: APP_PAGE_CONTENT_MAX_WIDTH,
        mx: "auto",
        width: "100%",
        boxSizing: "border-box",
        px: isSecured ? 0 : { xs: 2, sm: 3 },
        pb: { xs: isOwner ? 14 : 3, md: 5 },
      }}
    >
      {isSecured ? backButton : null}

      {/* Brand header */}
      <Box sx={{ mb: 1.5 }}>
        {auth.currentUser?.uid === invoice.userId ? (
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
              <Typography
                variant="h6"
                component="h1"
                color="#083a6b"
                sx={{ fontWeight: 800, fontSize: { xs: "0.95rem", sm: "1.05rem" }, minWidth: 0, lineHeight: 1.35 }}
              >
                INV-{displayNumber}
                <Box component="span" sx={{ fontWeight: 500, color: "text.secondary", mx: 0.75 }}>·</Box>
                <Box component="span" sx={{ fontWeight: 500, color: "text.secondary", fontSize: "0.875rem" }}>
                  {formatDateLong(invoice.invoiceDate)}
                </Box>
                {invoice.customerName ? (
                  <>
                    <Box component="span" sx={{ fontWeight: 500, color: "text.secondary", mx: 0.75 }}>·</Box>
                    <Box component="span" sx={{ fontWeight: 500, color: "text.secondary", fontSize: "0.875rem" }}>
                      Prepared for{" "}
                      <Box
                        component={Link}
                        to={`/secured/customer/${encodeURIComponent(getCustomerKey(invoice))}`}
                        sx={{
                          fontWeight: 700,
                          color: "#083a6b",
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                          "&:hover": { color: "#062d52" },
                        }}
                      >
                        {invoice.customerName}
                      </Box>
                    </Box>
                  </>
                ) : null}
              </Typography>
              <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                <Chip
                  label={statusChipProps.label}
                  {...("color" in statusChipProps ? { color: statusChipProps.color } : {})}
                  size="small"
                  sx={{ fontWeight: 700, ...statusChipProps.sx }}
                />
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap", pt: 2 }}>
            <Typography fontWeight={700} color="#083a6b" fontSize={{ xs: "1rem", sm: "1.1rem" }} sx={{ minWidth: 0 }}>
              Invoice from <Box component="span" fontWeight={800}>{invoice.businessName}</Box>
            </Typography>
            <Chip
              label={statusChipProps.label}
              {...("color" in statusChipProps ? { color: statusChipProps.color } : {})}
              size="small"
              sx={{ fontWeight: 600, flexShrink: 0, ...statusChipProps.sx }}
            />
          </Box>
        )}
      </Box>

      {/* Invoice card */}
      <Paper
        elevation={0}
        sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: { xs: 2, sm: 3 }, bgcolor: "#fff", boxShadow: "0 8px 28px rgba(15,23,42,0.07)", overflow: "hidden" }}
      >
        <Box
          sx={{
            display: "block",
            "@media (min-width:1281px)": {
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 300px",
              gap: 3,
            },
          }}
        >
          {/* Left: embedded PDF (desktop) or line-item list (mobile) */}
          <Box>
            {!isMobile && pdfBlobUrl ? (
              <Box sx={{ width: "100%", height: { xs: "75vh", md: "calc(100vh - 120px)" }, borderRadius: 1, overflow: "hidden", border: "1px solid #E5E7EB" }}>
                <iframe
                  src={`${pdfBlobUrl}#navpanes=0&view=FitH`}
                  title="Invoice PDF"
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              </Box>
            ) : null}

            {isMobile ? (
              <Box sx={{ mb: 2 }}>
                {(invoice.lineItems ?? []).map((item, i) => (
                  <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderBottom: "1px solid #F3F4F6" }}>
                    <Typography variant="body2" sx={{ flex: 1, pr: 2 }}>{item.description || "-"}</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ flexShrink: 0 }}>
                      {formatMoney((item.unitPrice ?? 0) * (item.quantity ?? 1))}
                    </Typography>
                  </Box>
                ))}

                <Box sx={{ mt: 1.5, pt: 1.5 }}>
                  {vatRegistered ? (
                    <>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">Subtotal (ex VAT)</Typography>
                        <Typography variant="body2" fontWeight={600}>{formatMoney(pricing.subtotal)}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">VAT</Typography>
                        <Typography variant="body2" fontWeight={600}>{formatMoney(pricing.tax)}</Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", pt: 0.25 }}>
                        <Typography variant="body2" fontWeight={700} color="#083a6b">Total (inc VAT)</Typography>
                        <Typography variant="body1" fontWeight={800} color="#083a6b">{formatMoney(pricing.total)}</Typography>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Typography variant="body2" fontWeight={700} color="#083a6b">Total</Typography>
                      <Typography variant="body1" fontWeight={800} color="#083a6b">{formatMoney(pricing.total)}</Typography>
                    </Box>
                  )}
                </Box>

                {pdfBlobUrl ? (
                  <Button
                    component="a"
                    href={pdfBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    fullWidth
                    startIcon={<FontAwesomeIcon icon={faDownload} style={{ fontSize: 14 }} />}
                    sx={{ mt: 2, textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", "&:hover": { bgcolor: "#EFF6FF", borderColor: "#083a6b" } }}
                  >
                    View / Download PDF
                  </Button>
                ) : null}
              </Box>
            ) : null}
          </Box>

          {/* Right: owner actions panel or customer payment panel */}
          <Box
            sx={{
              mt: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              "@media (min-width:1281px)": { mt: 0 },
            }}
          >
            {auth.currentUser?.uid === invoice.userId ? (
              /* ── Business owner view ── */
              <>
                <Box sx={{ display: { xs: "none", md: "block" }, mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Status</Typography>
                  <Chip
                    label={statusChipProps.label}
                    {...("color" in statusChipProps ? { color: statusChipProps.color } : {})}
                    sx={{ fontWeight: 700, fontSize: "0.875rem", ...statusChipProps.sx }}
                  />
                </Box>

                <Divider sx={{ display: { xs: "none", md: "block" }, mb: 2 }} />

                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, color: "#083a6b" }}>Share this invoice</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  Copy and share the link below, or use a quick share option.
                </Typography>

                <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={`${window.location.origin}/invoice/${invoiceId}`}
                    InputProps={{ readOnly: true, sx: { fontSize: "0.8rem", bgcolor: "#F8FAFC" } }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/invoice/${invoiceId}`)
                        .then(() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2500); });
                    }}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      flexShrink: 0,
                      borderColor: copiedLink ? "success.main" : "divider",
                      color: copiedLink ? "success.main" : "text.secondary",
                      "&:hover": { borderColor: copiedLink ? "success.main" : "#083a6b", color: copiedLink ? "success.main" : "#083a6b" },
                    }}
                  >
                    {copiedLink ? "Copied!" : "Copy link"}
                  </Button>
                </Box>

                <QuoteShareQuickButtons
                  quoteDocId={invoiceId}
                  documentKind="invoice"
                  customerName={invoice.customerName}
                  businessName={invoice.businessName}
                  quoteNumber={displayNumber}
                  currency={invoice.currency}
                  total={invoice.pricing?.total}
                  sx={{ mb: 1 }}
                />

                <Divider sx={{ mt: 2, mb: 2 }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {invoice.status === "unpaid" ? (
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      startIcon={<CheckIcon sx={{ fontSize: 18 }} />}
                      onClick={handleMarkPaid}
                      sx={{ textTransform: "none", fontWeight: 600, borderColor: "#16A34A", color: "#16A34A", ...SMALL_OUTLINED_ACTION_PADDING_SX, "&:hover": { bgcolor: "#F0FDF4", borderColor: "#15803d" } }}
                    >
                      Mark as paid
                    </Button>
                  ) : null}

                  {isPremium ? (
                    <Button
                      startIcon={<EditIcon />}
                      size="small"
                      variant="outlined"
                      onClick={() => navigate("/secured/invoice", { state: { editId: invoiceId, from: "invoiceView" } })}
                      sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", ...SMALL_OUTLINED_ACTION_PADDING_SX, "&:hover": { bgcolor: "#EFF6FF" } }}
                    >
                      Edit invoice
                    </Button>
                  ) : (
                    <Tooltip title="Upgrade to Premium to edit sent invoices" placement="left">
                      <Box sx={{ position: "relative", display: "inline-flex" }}>
                        <Button
                          startIcon={<LockOutlinedIcon />}
                          size="small"
                          variant="outlined"
                          onClick={() => navigate("/secured/billing", { state: { scrollToPremium: true } })}
                          sx={{ textTransform: "none", fontWeight: 600, borderColor: "#CBD5E1", color: "#9CA3AF", width: "100%", ...SMALL_OUTLINED_ACTION_PADDING_SX, "&:hover": { bgcolor: "#F8FAFC", borderColor: "#9CA3AF" } }}
                        >
                          Edit invoice
                        </Button>
                        <Chip
                          label="Premium"
                          size="small"
                          sx={{ position: "absolute", top: -8, right: -8, fontSize: "0.6rem", height: 16, bgcolor: "#083a6b", color: "#fff", fontWeight: 700, "& .MuiChip-label": { px: 0.75 } }}
                        />
                      </Box>
                    </Tooltip>
                  )}

                  <Button
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setDeleteDialogOpen(true)}
                    size="small"
                    sx={{ textTransform: "none", color: "#EF4444", bgcolor: "#FEF2F2", ...SMALL_OUTLINED_ACTION_PADDING_SX, "&:hover": { bgcolor: "#FEE2E2", color: "#DC2626" } }}
                  >
                    Delete invoice
                  </Button>
                </Box>
              </>
            ) : (
              /* ── Customer payment view ── */
              <Box sx={{ py: { xs: 1, md: 2 } }}>
                {paymentReturnBanner === "success" ? (
                  <Alert severity="success" sx={{ mb: 2 }} onClose={() => setPaymentReturnBanner(null)}>
                    Payment received. Your invoice will show as paid in a moment — refresh if it does not update.
                  </Alert>
                ) : null}
                {paymentReturnBanner === "cancel" ? (
                  <Alert severity="info" sx={{ mb: 2 }} onClose={() => setPaymentReturnBanner(null)}>
                    Payment was cancelled. You can pay anytime with the button below.
                  </Alert>
                ) : null}

                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Pay Online</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Amount due:{" "}
                  <Box component="span" fontWeight={800} color="#083a6b">{formatMoney(pricing.total)}</Box>
                </Typography>

                {invoice.status === "unpaid" && Number(pricing.total) > 0 ? (
                  <>
                    {invoicePayError ? (
                      <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setInvoicePayError("")}>
                        {invoicePayError}
                      </Alert>
                    ) : null}
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => { setInvoicePayError(""); setInvoicePayOpen(true); }}
                      sx={{ textTransform: "none", fontWeight: 700, fontSize: "1rem", bgcolor: "#10A86B", py: 1.5, mb: 1.5, borderRadius: 2, "&:hover": { bgcolor: "#0d9960" } }}
                    >
                      Pay now
                    </Button>

                    {/* Accepted card brands */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 1.25 }}>
                      <BrandBadge icon={siVisa} />
                      <BrandBadge icon={siMastercard} />
                      <BrandBadge icon={siAmericanexpress} />
                      <BrandBadge icon={siApplepay} bgColor="#000" fgColor="#fff" />
                      <BrandBadge icon={siGooglepay} />
                    </Box>

                    {/* Powered by Stripe */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                      <svg
                        role="img"
                        viewBox="0 0 24 24"
                        width={14}
                        height={14}
                        fill={`#${siStripe.hex}`}
                        xmlns="http://www.w3.org/2000/svg"
                        aria-label="Stripe"
                      >
                        <path d={siStripe.path} />
                      </svg>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                        Powered by{" "}
                        <Box component="span" sx={{ fontWeight: 700, color: `#${siStripe.hex}` }}>Stripe</Box>.
                      </Typography>
                    </Box>
                  </>
                ) : null}

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  Questions? Contact{" "}
                  <Box component="span" fontWeight={700}>{invoice.businessName}</Box>
                  {invoice.businessEmail ? (
                    <>
                      {" "}at{" "}
                      <Box component="a" href={`mailto:${invoice.businessEmail}`} sx={{ color: "#083a6b", fontWeight: 600 }}>
                        {invoice.businessEmail}
                      </Box>
                    </>
                  ) : null}.
                </Typography>
           
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      <InvoicePayDialog
        open={invoicePayOpen}
        onClose={() => setInvoicePayOpen(false)}
        invoiceId={invoiceId}
        amountLabel={formatMoney(pricing.total)}
        businessName={invoice.businessName ?? ""}
        onPaid={() => setPaymentReturnBanner("success")}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#083a6b" }}>Delete this invoice?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove{" "}
            <strong>INV-{displayNumber}</strong> for{" "}
            <strong>{invoice.customerName ?? "this customer"}</strong>.
            <Box component="span" sx={{ display: "block", mt: 1, color: "#EF4444" }}>
              The customer&apos;s link to this invoice will stop working.
            </Box>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: "none", color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#EF4444", "&:hover": { bgcolor: "#DC2626" } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoiceView;
