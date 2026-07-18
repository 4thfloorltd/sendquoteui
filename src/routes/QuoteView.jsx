import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { buildQuotePdfDocument } from "../utils/buildQuotePdfDocument";
import { loadBusinessLogoDataUrl } from "../utils/businessLogo";
import { formatDateLong, createFormatMoney } from "../utils/quoteDisplay";
import QuoteShareQuickButtons from "../components/QuoteShareQuickButtons";
import { createInvoiceFromQuote } from "../utils/createInvoiceFromQuote";
import { getCustomerKey } from "../utils/customerRecords";
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../constants/site";
import {
  AWAITING_STATUS_CHIP_SX,
  SECURED_BACK_TO_QUOTES_BUTTON_SX,
} from "../constants/quoteUi";

const isMobileDevice = () =>
  typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

/** Touch-friendly 48px row height; normalizes Link-as-button with outlined siblings. */
const SMALL_OUTLINED_ACTION_PADDING_SX = {
  height: 48,
  boxSizing: "border-box",
  px: "16px",
  py: 0,
};

const QuoteView = () => {
  const { quoteId: quoteIdParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isSecured = /^\/secured\/quote\/[^/]+$/.test(location.pathname);
  const isOwner = !!auth.currentUser;

  const [isPremium, setIsPremium] = useState(false);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteWorking, setDeleteWorking] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const pdfBlobUrlRef = useRef(null);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [decision, setDecision] = useState("");
  const [comment, setComment] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const pdfGenerated = { current: false };
    let firestoreUnsub = () => {};

    const subscribeFirestore = () => {
      firestoreUnsub();
      firestoreUnsub = onSnapshot(
        doc(db, "quotes", quoteIdParam),
        (snap) => {
          if (cancelled) return;
          if (!snap.exists()) {
            setError("This quote could not be found.");
            setLoading(false);
            return;
          }
          const data = snap.data();
          setQuote(data);
          setError("");

          if (data.status !== "pending") {
            setSubmitted(true);
            setDecision(data.status);
            setComment(data.comment ?? "");
          }

          if (!pdfGenerated.current) {
            pdfGenerated.current = true;
            (async () => {
              try {
                let businessPhone = data.businessPhone ?? "";
                let businessLogoUrl = data.businessLogoUrl ?? "";
                let businessLogoPath = data.businessLogoPath ?? "";
                let bankName = data.bankName ?? "";
                let bankAccountNumber = data.bankAccountNumber ?? "";
                let bankSortCode = data.bankSortCode ?? "";
                if (
                  data.userId
                  && (
                    !String(businessPhone).trim()
                    || !String(businessLogoUrl).trim()
                    || !String(bankName).trim()
                    || !String(bankAccountNumber).trim()
                    || !String(bankSortCode).trim()
                  )
                ) {
                  try {
                    const uSnap = await getDoc(doc(db, "users", data.userId));
                    if (uSnap.exists()) {
                      const ud = uSnap.data() || {};
                      if (!String(businessPhone).trim()) businessPhone = ud.businessPhone ?? "";
                      if (!String(businessLogoUrl).trim()) {
                        businessLogoUrl = ud.businessLogoUrl ?? "";
                        businessLogoPath = ud.businessLogoPath ?? businessLogoPath;
                      }
                      if (!String(bankName).trim()) bankName = ud.bankName ?? "";
                      if (!String(bankAccountNumber).trim()) bankAccountNumber = ud.bankAccountNumber ?? "";
                      if (!String(bankSortCode).trim()) bankSortCode = ud.bankSortCode ?? "";
                    }
                  } catch { /* ignore */ }
                }
                if (cancelled) return;
                const logoDataUrl = await loadBusinessLogoDataUrl({
                  businessLogoUrl,
                  businessLogoPath,
                });
                if (cancelled) return;
                const formatMoney = createFormatMoney(data.currency);
                const pdfDoc = buildQuotePdfDocument({
                  quoteData: {
                    quoteNumber: data.quoteNumber,
                    quoteDate: data.quoteDate,
                    businessName: data.businessName,
                    businessPhone,
                    businessEmail: data.businessEmail,
                    businessAddress: data.businessAddress,
                    businessLogoUrl,
                    businessLogoPath,
                    customerName: data.customerName,
                    email: data.customerEmail,
                    phone: data.customerPhone,
                    currency: data.currency,
                    bankName,
                    bankAccountNumber,
                    bankSortCode,
                  },
                  lineItems: data.lineItems ?? [],
                  pricing: data.pricing ?? { subtotal: 0, tax: 0, total: 0 },
                  formatMoney,
                  formatDateLong,
                  vatRegistered: data.vatRegistered ?? true,
                  documentKind: "quote",
                  logoDataUrl,
                });
                const blob = pdfDoc.output("blob");
                const url = URL.createObjectURL(blob);
                pdfBlobUrlRef.current = url;
                if (!cancelled) setPdfBlobUrl(url);
              } catch (pdfErr) {
                console.warn("PDF generation failed in QuoteView", pdfErr);
              }
            })();
          }
          setLoading(false);
        },
        (e) => {
          if (!cancelled) {
            console.error("QuoteView snapshot error", e);
            const code = String(e?.code ?? "");
            const msg = String(e?.message ?? "");
            const isPermission =
              code === "permission-denied"
              || code.endsWith("/permission-denied")
              || /permission|insufficient|PERMISSION_DENIED/i.test(msg);
            setError(
              isPermission
                ? "Cannot read this quote (permission denied). Check your Firestore security rules."
                : "Could not load this quote. Please try again later.",
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
  }, [quoteIdParam, isSecured]);

  const handleSubmit = async (chosenDecision) => {
    setDecision(chosenDecision);
    setSubmitting(true);
    setSubmitError("");
    try {
      const submitQuoteResponse = httpsCallable(getFunctions(), "submitQuoteResponse");
      await submitQuoteResponse({
        quoteId: quoteIdParam,
        status: chosenDecision,
        comment: comment.trim(),
      });
      setSubmitted(true);
    } catch (e) {
      console.error("Submit response failed", e);
      if (e?.message?.includes("already been responded to")) {
        setSubmitError("This quote has already been responded to.");
      } else {
        setSubmitError("Could not submit your response. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quoteIdParam || !auth.currentUser) return;
    setConvertLoading(true);
    setConvertError("");
    try {
      const newId = await createInvoiceFromQuote({ quoteId: quoteIdParam });
      navigate("/secured/invoice", { state: { editId: newId, from: "quoteConvert" } });
    } catch (e) {
      console.error("Convert to invoice failed", e);
      setConvertError(e?.message || "Could not create invoice. Please try again.");
    } finally {
      setConvertLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    setDeleteWorking(true);
    try {
      await updateDoc(doc(db, "quotes", quoteIdParam), {
        deleted: true,
        deletedAt: serverTimestamp(),
      });
      navigate("/secured/quotes");
    } catch (e) {
      console.error("Delete failed", e);
      setDeleteWorking(false);
      setDeleteDialogOpen(true);
    }
  };

  const backButton = (
    <Button
      component={Link}
      to="/secured/quotes"
      variant="text"
      color="inherit"
      startIcon={<ArrowBackIcon />}
      sx={SECURED_BACK_TO_QUOTES_BUTTON_SX}
    >
      Back to quotes
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
          <Typography variant="body1" fontWeight={600} color="text.primary">Deleting quote…</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
            Hang on while we remove this quote and update your list.
          </Typography>
        </Box>
      </Box>
    );
  }

  if (quote?.deleted) {
    return (
      <Box sx={{ maxWidth: isSecured ? APP_PAGE_CONTENT_MAX_WIDTH : 500, mx: "auto", width: isSecured ? "100%" : undefined, boxSizing: "border-box", px: isSecured ? 0 : 2, py: isSecured ? 4 : 10, pt: isSecured ? 0 : 10, textAlign: "center" }}>
        {isSecured ? <Box sx={{ textAlign: "left" }}>{backButton}</Box> : null}
        <Typography variant="h6" fontWeight={700} color="#083a6b" sx={{ mb: 1 }}>Quote no longer available</Typography>
        <Typography color="text.secondary">This quote has been removed by the sender.</Typography>
      </Box>
    );
  }

  const formatMoney = createFormatMoney(quote.currency);
  const pricing = quote.pricing ?? { subtotal: 0, tax: 0, total: 0 };
  const vatRegistered = quote.vatRegistered ?? true;
  const isMobile = isMobileDevice();
  const displayNumber = quote.quoteNumber ?? "-";

  const effectiveStatus = submitted ? decision : quote.status;
  const statusChipProps =
    ({
      pending: { label: "Pending", sx: AWAITING_STATUS_CHIP_SX },
      accepted: { label: "Accepted", color: "success" },
      declined: { label: "Declined", color: "error" },
    }[effectiveStatus] ?? { label: effectiveStatus, color: "default" });

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
        {auth.currentUser?.uid === quote.userId ? (
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
              <Typography
                variant="h6"
                component="h1"
                color="#083a6b"
                sx={{ fontWeight: 800, fontSize: { xs: "0.95rem", sm: "1.05rem" }, minWidth: 0, lineHeight: 1.35 }}
              >
                QU-{displayNumber}
                <Box component="span" sx={{ fontWeight: 500, color: "text.secondary", mx: 0.75 }}>·</Box>
                <Box component="span" sx={{ fontWeight: 500, color: "text.secondary", fontSize: "0.875rem" }}>
                  {formatDateLong(quote.quoteDate)}
                </Box>
                {quote.customerName ? (
                  <>
                    <Box component="span" sx={{ fontWeight: 500, color: "text.secondary", mx: 0.75 }}>·</Box>
                    <Box component="span" sx={{ fontWeight: 500, color: "text.secondary", fontSize: "0.875rem" }}>
                      Prepared for{" "}
                      <Box
                        component={Link}
                        to={`/secured/customer/${encodeURIComponent(getCustomerKey(quote))}`}
                        sx={{
                          fontWeight: 700,
                          color: "#083a6b",
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                          "&:hover": { color: "#062d52" },
                        }}
                      >
                        {quote.customerName}
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
            {quote.comment ? (
              <Box sx={{ display: { xs: "block", md: "none" }, mt: 1.5 }}>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.05em" }}>
                  Customer comment
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontStyle: "italic" }}>
                  &ldquo;{quote.comment}&rdquo;
                </Typography>
              </Box>
            ) : null}
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap", pt: 2 }}>
            <Typography fontWeight={700} color="#083a6b" fontSize={{ xs: "1rem", sm: "1.1rem" }} sx={{ minWidth: 0 }}>
              Quote from <Box component="span" fontWeight={800}>{quote.businessName}</Box>
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

      {/* Quote card */}
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
                  title="Quote PDF"
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              </Box>
            ) : null}

            {isMobile ? (
              <Box sx={{ mb: 2 }}>
                {(quote.lineItems ?? []).map((item, i) => (
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

          {/* Right: owner actions panel or customer accept/decline panel */}
          <Box
            sx={{
              mt: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              "@media (min-width:1281px)": { mt: 0 },
            }}
          >
            {auth.currentUser?.uid === quote.userId ? (
              /* ── Business owner view ── */
              <>
                <Box sx={{ display: { xs: "none", md: "block" }, mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Status</Typography>
                  <Chip
                    label={statusChipProps.label}
                    {...("color" in statusChipProps ? { color: statusChipProps.color } : {})}
                    sx={{ fontWeight: 700, fontSize: "0.875rem", ...statusChipProps.sx }}
                  />
                  {quote.comment ? (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.05em" }}>
                        Customer comment
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: "italic" }}>
                        &ldquo;{quote.comment}&rdquo;
                      </Typography>
                    </Box>
                  ) : null}
                </Box>

                <Divider sx={{ display: { xs: "none", md: "block" }, mb: 2 }} />

                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, color: "#083a6b" }}>Share this quote</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  Copy and share the link below, or use a quick share option.
                </Typography>

                <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={`${window.location.origin}/quote/${quoteIdParam}`}
                    InputProps={{ readOnly: true, sx: { fontSize: "0.8rem", bgcolor: "#F8FAFC" } }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/quote/${quoteIdParam}`)
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
                  quoteDocId={quoteIdParam}
                  documentKind="quote"
                  customerName={quote.customerName}
                  businessName={quote.businessName}
                  quoteNumber={displayNumber}
                  currency={quote.currency}
                  total={quote.pricing?.total}
                  sx={{ mb: 1 }}
                />

                <Divider sx={{ mt: 2, mb: 2 }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {isSecured ? (
                    quote.convertedToInvoiceId ? (
                      <Button
                        component={Link}
                        to={`/secured/invoice/${quote.convertedToInvoiceId}`}
                        size="small"
                        variant="outlined"
                        startIcon={<ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />}
                        sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", textDecoration: "none", ...SMALL_OUTLINED_ACTION_PADDING_SX, "&:hover": { bgcolor: "#EFF6FF" } }}
                      >
                        View invoice
                      </Button>
                    ) : (
                      <>
                        {convertError ? (
                          <Alert severity="error" sx={{ py: 0.5 }} onClose={() => setConvertError("")}>{convertError}</Alert>
                        ) : null}
                        <Button
                          startIcon={<NoteAddOutlinedIcon />}
                          size="small"
                          variant="outlined"
                          onClick={handleConvertToInvoice}
                          disabled={convertLoading}
                          sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", ...SMALL_OUTLINED_ACTION_PADDING_SX, "&:hover": { bgcolor: "#EFF6FF" } }}
                        >
                          {convertLoading ? <CircularProgress size={18} /> : "Convert to invoice"}
                        </Button>
                      </>
                    )
                  ) : null}

                  {isPremium ? (
                    <Button
                      startIcon={<EditIcon />}
                      size="small"
                      variant="outlined"
                      onClick={() => navigate("/secured/quote", { state: { editId: quoteIdParam, from: "quoteView" } })}
                      sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", ...SMALL_OUTLINED_ACTION_PADDING_SX, "&:hover": { bgcolor: "#EFF6FF" } }}
                    >
                      Edit quote
                    </Button>
                  ) : (
                    <Tooltip title="Upgrade to Premium to edit sent quotes" placement="left">
                      <Box sx={{ position: "relative", display: "inline-flex" }}>
                        <Button
                          startIcon={<LockOutlinedIcon />}
                          size="small"
                          variant="outlined"
                          onClick={() => navigate("/secured/billing", { state: { scrollToPremium: true } })}
                          sx={{ textTransform: "none", fontWeight: 600, borderColor: "#CBD5E1", color: "#9CA3AF", width: "100%", ...SMALL_OUTLINED_ACTION_PADDING_SX, "&:hover": { bgcolor: "#F8FAFC", borderColor: "#9CA3AF" } }}
                        >
                          Edit quote
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
                    Delete quote
                  </Button>
                </Box>
              </>
            ) : submitted ? (
              /* ── Customer: already responded ── */
              <Box sx={{ textAlign: "center", py: { xs: 2, md: 4 } }}>
                {decision === "accepted" ? (
                  <CheckCircleOutlineIcon sx={{ fontSize: 52, color: "success.main", mb: 1 }} />
                ) : (
                  <CancelOutlinedIcon sx={{ fontSize: 52, color: "error.main", mb: 1 }} />
                )}
                <Typography variant="h6" fontWeight={700}>
                  {decision === "accepted" ? "Quote accepted" : "Quote declined"}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Thank you - your response has been sent to{" "}
                  <Box component="span" fontWeight={700}>{quote.businessName}</Box>.
                </Typography>
                {comment ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: "italic" }}>
                    &ldquo;{comment}&rdquo;
                  </Typography>
                ) : null}
              </Box>
            ) : (
              /* ── Customer: pending response ── */
              <>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Your quote response</Typography>
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    fullWidth
                    onClick={() => handleSubmit("accepted")}
                    disabled={submitting}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    {submitting && decision === "accepted" ? <CircularProgress size={20} color="inherit" /> : "Accept"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="large"
                    fullWidth
                    onClick={() => handleSubmit("declined")}
                    disabled={submitting}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    {submitting && decision === "declined" ? <CircularProgress size={20} color="inherit" /> : "Decline"}
                  </Button>
                </Box>

                {!commentOpen ? (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography
                      component="button"
                      onClick={() => setCommentOpen(true)}
                      variant="body2"
                      sx={{
                        color: "primary.main", background: "none", border: "none",
                        cursor: "pointer", textDecoration: "underline",
                        textDecorationStyle: "dotted", textUnderlineOffset: 3,
                        p: 0, "&:hover": { color: "primary.dark" },
                      }}
                    >
                      Add a comment (optional)
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ mt: 1.5 }}>
                    <TextField
                      placeholder="Add a comment (optional)"
                      multiline minRows={3} maxRows={6} fullWidth autoFocus
                      value={comment} onChange={(e) => setComment(e.target.value)}
                      disabled={submitting} size="small"
                      sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.9rem" } }}
                    />
                  </Box>
                )}

                {submitError ? (
                  <Alert severity="error" sx={{ mt: 1.5, alignItems: "center" }}>{submitError}</Alert>
                ) : null}
              </>
            )}
          </Box>
        </Box>
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#083a6b" }}>Delete this quote?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove{" "}
            <strong>QU-{displayNumber}</strong> for{" "}
            <strong>{quote.customerName ?? "this customer"}</strong>.
            {(quote.status === "accepted" || quote.status === "declined") && (
              <Box component="span" sx={{ display: "block", mt: 1, color: "#EF4444" }}>
                This quote has already been {quote.status} - the customer&apos;s link will stop working.
              </Box>
            )}
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

export default QuoteView;
