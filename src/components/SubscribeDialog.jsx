import { useEffect, useRef, useState } from "react";
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
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { httpsCallable } from "firebase/functions";
import { onSnapshot, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, functions } from "../../firebase";
import { FREE_QUOTE_LIMIT, PREMIUM_PLAN_FEATURES } from "../constants/plan";
import { formatPremiumMonthlyDisplay } from "../helpers/currency";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/** Visitor-locale price label (e.g. £9.99 or $9.99) — same logic as landing. */
const premiumMonthlyFormatted = formatPremiumMonthlyDisplay();

// ─── Inner payment form (must be inside <Elements>) ───────────────────────────
function PaymentForm({ onSuccess, onCancel }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying]   = useState(false);
  const [error, setError]     = useState("");
  const [expressAvailable, setExpressAvailable] = useState(false);

  const confirm = async () => {
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

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError("");
    await confirm();
  };

  const handleExpressConfirm = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setError("");
    await confirm();
  };

  return (
    <form onSubmit={handlePay}>
      {/* Apple Pay / Google Pay / Link (shown only when available in this browser) */}
      <Box sx={{ mb: expressAvailable ? 2 : 0 }}>
        <ExpressCheckoutElement
          onReady={({ availablePaymentMethods }) => {
            const methods = availablePaymentMethods || {};
            setExpressAvailable(
              Boolean(methods.applePay || methods.googlePay || methods.link),
            );
          }}
          onConfirm={handleExpressConfirm}
          options={{
            paymentMethods: {
              applePay: "always",
              googlePay: "always",
              link: "auto",
              paypal: "never",
              amazonPay: "never",
            },
            buttonHeight: 44,
          }}
        />
      </Box>

      {expressAvailable && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Divider sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            or pay with card
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <PaymentElement
          options={{
            layout: "tabs",
            // Wallets are handled above by ExpressCheckoutElement to avoid
            // duplicate buttons inside the card tab.
            wallets: { applePay: "never", googlePay: "never" },
          }}
        />
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, alignItems: "center" }}>{error}</Alert>
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
            : `Pay ${premiumMonthlyFormatted} / month`}
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
 *   skipOverview   – jump straight to the embedded Stripe payment form
 */
const SubscribeDialog = ({ open, onClose, onSuccess, quotaExhausted = false, skipOverview = false }) => {
  const [step, setStep]               = useState(skipOverview ? 2 : 1); // 1 = overview, 2 = payment, 3 = success
  const [clientSecret, setClientSecret] = useState("");
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError]   = useState("");
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const unsubPlanRef = useRef(null);

  // Reset when dialog closes.
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(skipOverview ? 2 : 1);
        setClientSecret("");
        setIntentError("");
        setPlanConfirmed(false);
        unsubPlanRef.current?.();
        unsubPlanRef.current = null;
      }, 300);
    }
  }, [open, skipOverview]);

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

  // When opened in skip-overview mode, fetch the client secret immediately
  // so the Stripe PaymentElement can render on first paint.
  useEffect(() => {
    if (open && skipOverview && !clientSecret && !intentLoading) {
      handleSubscribeClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, skipOverview]);

  const handlePaymentSuccess = async () => {
    setStep(3);
    try { await onSuccess?.(); } catch (_) {}

    // Listen for Firestore to confirm plan === "premium" (set by Stripe webhook).
    // This ensures all quota checks have updated before the user can dismiss.
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      unsubPlanRef.current?.();
      unsubPlanRef.current = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.data()?.plan === "premium") {
          setPlanConfirmed(true);
          unsubPlanRef.current?.();
          unsubPlanRef.current = null;
        }
      });
    });
    // Clean up the auth listener immediately after getting the user.
    setTimeout(unsub, 0);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>

      {/* ── Step 1: Plan overview ── */}
      {step === 1 && (
        <>
          <DialogTitle sx={{ fontWeight: 700, color: "#083a6b", pb: 1.5 }}>
            {quotaExhausted ? "You've reached your free limit" : "Upgrade to Premium"}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {quotaExhausted && (
              <Alert severity="warning" icon={<LockOutlinedIcon fontSize="inherit" />} sx={{ mb: 2, fontWeight: 600, alignItems: "center" }}>
                You&apos;ve used all <strong>{FREE_QUOTE_LIMIT} free quotes</strong>. Upgrade for unlimited.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {quotaExhausted ? (
                <>
                  Get <strong>unlimited quotes</strong> plus all <strong>Premium features</strong> for just{" "}
                  <strong>{premiumMonthlyFormatted}/month</strong>.
                </>
              ) : (
                `Unlock all features for just ${premiumMonthlyFormatted}/month. Cancel any time.`
              )}
            </Typography>
            <Box sx={{ border: "2px solid #083a6b", borderRadius: 2, p: 2.5, bgcolor: "#F0F4FF" }}>
              <Typography fontWeight={800} color="#083a6b" fontSize="1.1rem">Premium Plan</Typography>
              <Typography variant="h5" fontWeight={800} color="#083a6b" sx={{ mt: 0.5 }}>
                {premiumMonthlyFormatted}
                <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>/month</Typography>
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              {PREMIUM_PLAN_FEATURES.map((feat) => (
                <Box key={feat} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "#10A86B" }} />
                  <Typography variant="body2">{feat}</Typography>
                </Box>
              ))}
            </Box>
            {intentError && (
              <Alert severity="error" sx={{ mt: 1.5, alignItems: "center" }}>{intentError}</Alert>
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
                : `Subscribe — ${premiumMonthlyFormatted}/mo`}
            </Button>
          </DialogActions>
        </>
      )}

      {/* ── Step 2: Embedded Stripe payment form ── */}
      {step === 2 && (
        <>
          <DialogTitle sx={{ fontWeight: 700, color: "#083a6b", pb: 0 }}>
            Payment details
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}>
              🔒 Secure payment powered by Stripe
            </Typography>
            {intentError && (
              <Alert severity="error" sx={{ mb: 2, alignItems: "center" }}>{intentError}</Alert>
            )}
            {clientSecret ? (
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
                <PaymentForm
                  onSuccess={handlePaymentSuccess}
                  onCancel={skipOverview ? handleClose : () => setStep(1)}
                />
              </Elements>
            ) : (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={28} sx={{ color: "#083a6b" }} />
              </Box>
            )}
          </DialogContent>
        </>
      )}

      {/* ── Step 3: Success ── */}
      {step === 3 && (
        <>
          <DialogContent sx={{ pt: 4, pb: 2, textAlign: "center" }}>
            {planConfirmed ? (
              <>
                <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "#10A86B", mb: 1.5 }} />
                <Typography variant="h6" fontWeight={800} color="#083a6b">
                  You&apos;re on Premium!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Your subscription is now active. Enjoy unlimited quotes and all Premium features.
                </Typography>
              </>
            ) : (
              <>
                <CircularProgress size={40} sx={{ color: "#083a6b", mb: 2 }} />
                <Typography variant="h6" fontWeight={700} color="#083a6b">
                  Activating your subscription…
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This usually takes a few seconds.
                </Typography>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              variant="contained"
              fullWidth
              disabled={!planConfirmed}
              onClick={handleClose}
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}
            >
              Get started
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default SubscribeDialog;
