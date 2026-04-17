import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import { FREE_QUOTE_LIMIT } from "../constants/plan";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const FEATURES = [
  "Unlimited quotes",
  "Edit sent quotes",
  "Search by name, email or quote ID",
  "PDF import to pre-fill quotes",
  "Ad-free experience",
  "Priority support",
];

// ─── Inner payment form (must be inside <Elements>) ───────────────────────────
function PaymentForm({ onSuccess, onCancel }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying]   = useState(false);
  const [error, setError]     = useState("");

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError("");
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handlePay}>
      <Box sx={{ mb: 2 }}>
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "auto", googlePay: "auto" },
          }}
        />
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          onClick={onCancel}
          disabled={paying}
          sx={{ textTransform: "none", color: "text.secondary", flex: "0 0 auto" }}
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={paying || !stripe}
          fullWidth
          sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}
        >
          {paying
            ? <CircularProgress size={18} sx={{ color: "#fff" }} />
            : "Pay £9.99 / month"}
        </Button>
      </Box>
    </form>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────
/**
 * Props:
 *   open           – boolean
 *   onClose        – called on dismiss
 *   onSuccess      – called after successful payment (optional — for post-payment logic)
 *   quotaExhausted – show "you've used all X free quotes" banner
 */
const SubscribeDialog = ({ open, onClose, onSuccess, quotaExhausted = false }) => {
  const [step, setStep]               = useState(1); // 1 = overview, 2 = payment, 3 = success
  const [clientSecret, setClientSecret] = useState("");
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError]   = useState("");

  // Reset when dialog closes.
  useEffect(() => {
    if (!open) {
      setTimeout(() => { setStep(1); setClientSecret(""); setIntentError(""); }, 300);
    }
  }, [open]);

  const handleClose = () => {
    if (intentLoading) return;
    onClose?.();
  };

  const handleSubscribeClick = async () => {
    setIntentLoading(true);
    setIntentError("");
    try {
      const { data } = await httpsCallable(functions, "createSubscriptionIntent")();
      setClientSecret(data.clientSecret);
      setStep(2);
    } catch (err) {
      setIntentError(err.message ?? "Could not start checkout. Please try again.");
    } finally {
      setIntentLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setStep(3);
    try { await onSuccess?.(); } catch (_) {}
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>

      {/* ── Step 1: Plan overview ── */}
      {step === 1 && (
        <>
          <DialogTitle sx={{ fontWeight: 700, color: "#083a6b", pb: 0 }}>
            {quotaExhausted ? "You've reached your free limit" : "Upgrade to Premium"}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {quotaExhausted && (
              <Alert severity="warning" icon={<LockOutlinedIcon fontSize="inherit" />} sx={{ mb: 2, fontWeight: 600 }}>
                You&apos;ve used all <strong>{FREE_QUOTE_LIMIT} free quotes</strong>. Upgrade for unlimited.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {quotaExhausted
                ? "Get unlimited quotes plus all Premium features for just £9.99/month."
                : "Unlock all features for just £9.99/month. Cancel any time."}
            </Typography>
            <Box sx={{ border: "2px solid #083a6b", borderRadius: 2, p: 2.5, bgcolor: "#F0F4FF" }}>
              <Typography fontWeight={800} color="#083a6b" fontSize="1.1rem">Premium Plan</Typography>
              <Typography variant="h5" fontWeight={800} color="#083a6b" sx={{ mt: 0.5 }}>
                £9.99
                <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>/month</Typography>
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              {FEATURES.map((feat) => (
                <Box key={feat} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "#10A86B" }} />
                  <Typography variant="body2">{feat}</Typography>
                </Box>
              ))}
            </Box>
            {intentError && (
              <Alert severity="error" sx={{ mt: 1.5 }}>{intentError}</Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={handleClose} disabled={intentLoading}
              sx={{ textTransform: "none", color: "text.secondary" }}>
              Maybe later
            </Button>
            <Button variant="contained" disabled={intentLoading} onClick={handleSubscribeClick}
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" }, flex: 1 }}>
              {intentLoading
                ? <CircularProgress size={18} sx={{ color: "#fff" }} />
                : "Subscribe — £9.99/mo"}
            </Button>
          </DialogActions>
        </>
      )}

      {/* ── Step 2: Embedded Stripe payment form ── */}
      {step === 2 && clientSecret && (
        <>
          <DialogTitle sx={{ fontWeight: 700, color: "#083a6b", pb: 0 }}>
            Payment details
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}>
              🔒 Secure payment powered by Stripe
            </Typography>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: { colorPrimary: "#083a6b", borderRadius: "6px" },
                },
              }}
            >
              <PaymentForm onSuccess={handlePaymentSuccess} onCancel={() => setStep(1)} />
            </Elements>
          </DialogContent>
        </>
      )}

      {/* ── Step 3: Success ── */}
      {step === 3 && (
        <>
          <DialogContent sx={{ pt: 4, pb: 2, textAlign: "center" }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "#10A86B", mb: 1.5 }} />
            <Typography variant="h6" fontWeight={800} color="#083a6b">
              You&apos;re on Premium!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Your subscription is now active. Enjoy unlimited quotes and all Premium features.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="contained" fullWidth onClick={handleClose}
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}>
              Get started
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default SubscribeDialog;
