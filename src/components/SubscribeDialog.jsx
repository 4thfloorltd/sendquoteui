import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const FEATURES = [
  "Unlimited quotes",
  "Edit sent quotes",
  "Search by name, email or quote ID",
  "PDF import to pre-fill quotes",
  "Ad-free experience",
  "Priority support",
];

/**
 * Reusable upgrade dialog.
 *
 * Props:
 *   open       – boolean
 *   onClose    – called when user dismisses without subscribing
 *   onSuccess  – async fn called after "payment"; should persist plan to Firestore
 *   successCta – label for the step-3 close button (default "Done")
 */
const SubscribeDialog = ({ open, onClose, onSuccess, successCta = "Done", initialStep = 1 }) => {
  const [step, setStep]           = useState(initialStep);
  const [loading, setLoading]     = useState(false);
  const [cardName, setCardName]   = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry]       = useState("");
  const [cvc, setCvc]             = useState("");

  const reset = () => {
    setStep(initialStep);
    setLoading(false);
    setCardName("");
    setCardNumber("");
    setExpiry("");
    setCvc("");
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose?.();
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      await onSuccess?.();
      setStep(3);
    } catch (e) {
      console.error("Upgrade failed", e);
    } finally {
      setLoading(false);
    }
  };

  const canPay =
    cardName.trim() &&
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiry.replace(/[\s/]/g, "").length === 4 &&
    cvc.length >= 3;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>

      {/* ── Step 1: plan overview ── */}
      {step === 1 && (
        <>
          <DialogTitle sx={{ fontWeight: 700, color: "#083a6b", pb: 0 }}>
            Upgrade to Premium
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Unlock all features with a Premium subscription.
            </Typography>
            <Box sx={{ border: "2px solid #083a6b", borderRadius: 2, p: 2.5, bgcolor: "#F0F4FF" }}>
              <Typography fontWeight={800} color="#083a6b" fontSize="1.1rem">
                Premium Plan
              </Typography>
              <Typography variant="h5" fontWeight={800} color="#083a6b" sx={{ mt: 0.5 }}>
                £9.99
                <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
                  /month
                </Typography>
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              {FEATURES.map((feat) => (
                <Box key={feat} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "#10A86B" }} />
                  <Typography variant="body2">{feat}</Typography>
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={handleClose} sx={{ textTransform: "none", color: "text.secondary" }}>
              Maybe later
            </Button>
            <Button
              variant="contained"
              onClick={() => setStep(2)}
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" }, flex: 1 }}
            >
              Subscribe — £9.99/mo
            </Button>
          </DialogActions>
        </>
      )}

      {/* ── Step 2: payment form ── */}
      {step === 2 && (
        <>
          <DialogTitle sx={{ fontWeight: 700, color: "#083a6b", pb: 0 }}>
            Payment details
          </DialogTitle>
          <DialogContent sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 1.5, px: 1.5, py: 1, mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#854D0E", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Test mode
              </Typography>
              <Typography variant="caption" sx={{ color: "#713F12" }}>
                — no real charge will be made. Stripe integration coming soon.
              </Typography>
            </Box>
            <TextField
              label="Name on card"
              fullWidth
              size="small"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <TextField
              label="Card number"
              fullWidth
              size="small"
              value={cardNumber}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                setCardNumber(raw.replace(/(.{4})/g, "$1 ").trim());
              }}
              inputProps={{ inputMode: "numeric", maxLength: 19 }}
              placeholder="1234 5678 9012 3456"
              disabled={loading}
            />
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                label="MM / YY"
                size="small"
                value={expiry}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  if (v.length > 2) v = `${v.slice(0, 2)} / ${v.slice(2)}`;
                  setExpiry(v);
                }}
                inputProps={{ inputMode: "numeric", maxLength: 7 }}
                placeholder="MM / YY"
                disabled={loading}
                sx={{ flex: 1 }}
              />
              <TextField
                label="CVC"
                size="small"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputProps={{ inputMode: "numeric", maxLength: 4 }}
                placeholder="123"
                disabled={loading}
                sx={{ flex: 1 }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            {initialStep < 2 ? (
              <Button
                onClick={() => setStep(1)}
                disabled={loading}
                sx={{ textTransform: "none", color: "text.secondary" }}
              >
                Back
              </Button>
            ) : (
              <Button
                onClick={handleClose}
                disabled={loading}
                sx={{ textTransform: "none", color: "text.secondary" }}
              >
                Maybe later
              </Button>
            )}
            <Button
              variant="contained"
              disabled={!canPay || loading}
              onClick={handlePay}
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" }, flex: 1 }}
            >
              {loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Pay £9.99"}
            </Button>
          </DialogActions>
        </>
      )}

      {/* ── Step 3: success ── */}
      {step === 3 && (
        <>
          <DialogContent sx={{ pt: 4, pb: 2, textAlign: "center" }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "#10A86B", mb: 1.5 }} />
            <Typography variant="h6" fontWeight={800} color="#083a6b">
              You&apos;re on Premium!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Your subscription is active. Enjoy unlimited quotes and all Premium features.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => { reset(); onClose?.(); }}
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}
            >
              {successCta}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default SubscribeDialog;
