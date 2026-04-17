import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
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
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "@mui/material";
import { buildQuotePdfDocument, getQuotePdfFilename } from "../utils/buildQuotePdfDocument";
import { formatDateLong, createFormatMoney } from "../utils/quoteDisplay";
import QuoteShareQuickButtons from "../components/QuoteShareQuickButtons";

const isMobileDevice = () =>
  typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

const QuoteView = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const isOwner = !!auth.currentUser;
  const [isPremium, setIsPremium] = useState(false);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const pdfBlobUrlRef = useRef(null);

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

    // Load plan for the owner (to gate premium features).
    if (auth.currentUser) {
      getDoc(doc(db, "users", auth.currentUser.uid))
        .then((s) => { if (!cancelled) setIsPremium(s.data()?.plan === "premium"); })
        .catch(() => {});
    }

    const unsub = onSnapshot(
      doc(db, "quotes", quoteId),
      (snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setError("This quote could not be found.");
          setLoading(false);
          return;
        }
        const data = snap.data();
        setQuote(data);

        if (data.status !== "pending") {
          setSubmitted(true);
          setDecision(data.status);
          setComment(data.comment ?? "");
        }

        // Generate PDF only once on first load — status changes don't affect PDF content.
        if (!pdfGenerated.current) {
          pdfGenerated.current = true;
          try {
            const formatMoney = createFormatMoney(data.currency);
            const pdfDoc = buildQuotePdfDocument({
              quoteData: {
                quoteNumber: data.quoteNumber,
                quoteDate: data.quoteDate,
                businessName: data.businessName,
                businessEmail: data.businessEmail,
                businessAddress: data.businessAddress,
                customerName: data.customerName,
                email: data.customerEmail,
                currency: data.currency,
              },
              lineItems: data.lineItems ?? [],
              pricing: data.pricing ?? { subtotal: 0, tax: 0, total: 0 },
              formatMoney,
              formatDateLong,
              vatRegistered: data.vatRegistered ?? true,
            });
            const blob = pdfDoc.output("blob");
            const url = URL.createObjectURL(blob);
            pdfBlobUrlRef.current = url;
            if (!cancelled) setPdfBlobUrl(url);
          } catch (pdfErr) {
            console.warn("PDF generation failed in QuoteView", pdfErr);
          }
        }

        setLoading(false);
      },
      (e) => {
        if (!cancelled) {
          console.error("QuoteView snapshot error", e);
          setError("Could not load this quote. Please try again later.");
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
      unsub();
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = null;
      }
    };
  }, [quoteId]);

  const handleDownload = () => {
    if (!quote) return;
    const formatMoney = createFormatMoney(quote.currency);
    const pdfDoc = buildQuotePdfDocument({
      quoteData: {
        quoteNumber: quote.quoteNumber,
        quoteDate: quote.quoteDate,
        businessName: quote.businessName,
        businessEmail: quote.businessEmail,
        businessAddress: quote.businessAddress,
        customerName: quote.customerName,
        email: quote.customerEmail,
        currency: quote.currency,
      },
      lineItems: quote.lineItems ?? [],
      pricing: quote.pricing ?? { subtotal: 0, tax: 0, total: 0 },
      formatMoney,
      formatDateLong,
      vatRegistered: quote.vatRegistered ?? true,
    });
    const filename = getQuotePdfFilename({
      quoteNumber: quote.quoteNumber,
      businessName: quote.businessName,
      customerName: quote.customerName,
    });
    pdfDoc.save(filename);
  };

  const handleSubmit = async (chosenDecision) => {
    setDecision(chosenDecision);
    setSubmitting(true);
    setSubmitError("");
    try {
      const submitQuoteResponse = httpsCallable(getFunctions(), "submitQuoteResponse");
      await submitQuoteResponse({
        quoteId,
        status:  chosenDecision,
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

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", px: 2, py: 6 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (quote?.deleted) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", px: 2, py: 10, textAlign: "center" }}>
        <Typography variant="h6" fontWeight={700} color="#083a6b" sx={{ mb: 1 }}>
          Quote no longer available
        </Typography>
        <Typography color="text.secondary">
          This quote has been removed by the sender.
        </Typography>
      </Box>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await updateDoc(doc(db, "quotes", quoteId), {
        deleted: true,
        deletedAt: serverTimestamp(),
      });
      navigate("/secured/quotes");
    } catch (e) {
      console.error("Delete failed", e);
      setDeleting(false);
    }
  };

  const formatMoney = createFormatMoney(quote.currency);
  const isMobile = isMobileDevice();

  const effectiveStatus = submitted ? decision : quote.status;
  const statusChipProps = {
    pending: { label: "Pending", color: "default" },
    accepted: { label: "Accepted", color: "success" },
    declined: { label: "Declined", color: "error" },
  }[effectiveStatus] ?? { label: effectiveStatus, color: "default" };

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3 }, pt: 1, pb: { xs: isOwner ? 14 : 3, md: 5 } }}>
      {/* Brand header */}
      <Box sx={{ mb: 3 }}>
        {auth.currentUser?.uid === quote.userId ? (
          /* ── Owner header ── */
          <Box sx={{ minWidth: 0 }}>
            {/* Quote ID + status chip on same row */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "nowrap" }}>
              <Typography
                variant="h6"
                component="h1"
                color="#083a6b"
                sx={{ fontWeight: 800, fontSize: { xs: "1rem", sm: "1.2rem" }, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                QU-{quote.quoteNumber ?? "—"}
              </Typography>
              {/* Status — mobile only; desktop is in the right panel */}
              <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  Status:
                </Typography>
                <Chip
                  label={statusChipProps.label}
                  color={statusChipProps.color}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {formatDateLong(quote.quoteDate)}
            </Typography>

            {quote.customerName ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Prepared for{" "}
                <Box component="span" sx={{ fontWeight: 700, color: "#083a6b" }}>
                  {quote.customerName}
                </Box>
              </Typography>
            ) : null}

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
          /* ── Customer header ── */
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap", pt: 2 }}>
            <Typography fontWeight={700} color="#083a6b" fontSize={{ xs: "1rem", sm: "1.1rem" }} sx={{ minWidth: 0 }}>
              Quote from{" "}
              <Box component="span" fontWeight={800}>{quote.businessName}</Box>
            </Typography>
            <Chip
              label={statusChipProps.label}
              color={statusChipProps.color}
              size="small"
              sx={{ fontWeight: 600, flexShrink: 0 }}
            />
          </Box>
        )}
      </Box>

      {/* Quote card */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #E5E7EB",
          borderRadius: 2,
          p: { xs: 2, sm: 3 },
          bgcolor: "#fff",
          boxShadow: "0 8px 28px rgba(15,23,42,0.07)",
          overflow: "hidden",
        }}
      >
        {/* Two-column on desktop, stacked on mobile */}
        <Box
          sx={{
            display: { xs: "block", md: "grid" },
            gridTemplateColumns: { md: "1fr 300px" },
            gap: { md: 3 },
          }}
        >
          {/* Left column: PDF (desktop) or line items (mobile) */}
          <Box>
            {!isMobile && pdfBlobUrl ? (
              <Box
                sx={{
                  width: "100%",
                  height: { xs: "75vh", md: "calc(100vh - 120px)" },
                  borderRadius: 1,
                  overflow: "hidden",
                  border: "1px solid #E5E7EB",
                }}
              >
                <iframe
                  src={`${pdfBlobUrl}#navpanes=0&view=FitH`}
                  title="Quote PDF"
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              </Box>
            ) : null}

            {/* Mobile: line items + view PDF button */}
            {isMobile ? (
              <Box sx={{ mb: 2 }}>
                {(quote.lineItems ?? []).map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 0.75,
                      borderBottom: "1px solid #F3F4F6",
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1, pr: 2 }}>
                      {item.description || "—"}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ flexShrink: 0 }}>
                      {formatMoney((item.unitPrice ?? 0) * (item.quantity ?? 1))}
                    </Typography>
                  </Box>
                ))}

                {pdfBlobUrl && (
                  <Button
                    component="a"
                    href={pdfBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    fullWidth
                    startIcon={<FontAwesomeIcon icon={faDownload} style={{ fontSize: 14 }} />}
                    sx={{
                      mt: 2,
                      textTransform: "none",
                      fontWeight: 600,
                      borderColor: "#083a6b",
                      color: "#083a6b",
                      "&:hover": { bgcolor: "#EFF6FF", borderColor: "#083a6b" },
                    }}
                  >
                    View / Download PDF
                  </Button>
                )}
              </Box>
            ) : null}
          </Box>

          {/* Right column: owner share panel OR customer response panel */}
          <Box
            sx={{
              mt: { xs: 3, md: 0 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
            }}
          >
            {auth.currentUser?.uid === quote.userId ? (
              /* ── Business owner view ── */
              <>
                {/* Status — desktop / tablet only (mobile: same row as quote number in header) */}
                <Box sx={{ display: { xs: "none", md: "block" }, mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Status
                  </Typography>
                  <Chip
                    label={statusChipProps.label}
                    color={statusChipProps.color}
                    sx={{ fontWeight: 700, fontSize: "0.875rem" }}
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

                {/* Share link */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, color: "#083a6b" }}>
                  Share this quote
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25 }}>
                  Copy and share the link below, or use a quick share option.
                </Typography>

                <QuoteShareQuickButtons quoteDocId={quoteId} sx={{ mb: 1.5 }} />

                {/* Copy link */}
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={`${window.location.origin}/quote/${quoteId}`}
                    InputProps={{ readOnly: true, sx: { fontSize: "0.8rem", bgcolor: "#F8FAFC" } }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/quote/${quoteId}`)
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

                {/* Edit / Delete quote */}
                <Divider sx={{ mt: 3, mb: 2 }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {isPremium ? (
                    <Button
                      startIcon={<EditIcon />}
                      size="small"
                      variant="outlined"
                      onClick={() => navigate("/secured/quote", { state: { editId: quoteId, from: "quoteView" } })}
                      sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", "&:hover": { bgcolor: "#EFF6FF" } }}
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
                          onClick={() => navigate("/secured/billing")}
                          sx={{ textTransform: "none", fontWeight: 600, borderColor: "#CBD5E1", color: "#9CA3AF", width: "100%", "&:hover": { bgcolor: "#F8FAFC", borderColor: "#9CA3AF" } }}
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
                    sx={{ textTransform: "none", color: "#EF4444", bgcolor: "#FEF2F2", "&:hover": { bgcolor: "#FEE2E2", color: "#DC2626" } }}
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
                  Thank you — your response has been sent to{" "}
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
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                  Your response
                </Typography>
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
                  <Alert severity="error" sx={{ mt: 1.5 }}>{submitError}</Alert>
                ) : null}
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#083a6b" }}>Delete this quote?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove <strong>QU-{quote.quoteNumber ?? "—"}</strong> for <strong>{quote.customerName ?? "this customer"}</strong>.
            {(quote.status === "accepted" || quote.status === "declined") && (
              <Box component="span" sx={{ display: "block", mt: 1, color: "#EF4444" }}>
                This quote has already been {quote.status} - the customer&apos;s link will stop working.
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ textTransform: "none", color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#EF4444", "&:hover": { bgcolor: "#DC2626" } }}
          >
            {deleting ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


export default QuoteView;
