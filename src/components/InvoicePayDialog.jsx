import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { createInvoicePaymentIntent } from "../api/createInvoicePaymentIntent";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function InvoicePaymentForm({ amountLabel, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
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

      {expressAvailable ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Divider sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            or pay with card
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
      ) : null}

      <Box sx={{ mb: 2 }}>
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "never", googlePay: "never" },
          }}
        />
      </Box>
      {error ? (
        <Alert severity="error" sx={{ mb: 2, alignItems: "center" }}>{error}</Alert>
      ) : null}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          type="button"
          onClick={onCancel}
          disabled={paying}
          sx={{ textTransform: "none", color: "text.secondary", flex: "0 0 auto" }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={paying || !stripe}
          fullWidth
          sx={{
            textTransform: "none",
            fontWeight: 700,
            bgcolor: "#10A86B",
            "&:hover": { bgcolor: "#13C47A" },
          }}
        >
          {paying ? (
            <CircularProgress size={18} sx={{ color: "#fff" }} />
          ) : (
            `Pay ${amountLabel}`
          )}
        </Button>
      </Box>
    </form>
  );
}

/**
 * Embedded Stripe payment for an invoice (same UX pattern as SubscribeDialog).
 */
export default function InvoicePayDialog({
  open,
  onClose,
  invoiceId,
  amountLabel,
  businessName = "",
  onPaid,
}) {
  const [clientSecret, setClientSecret] = useState("");
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError] = useState("");

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setClientSecret("");
        setIntentError("");
      }, 280);
      return;
    }

    const id = String(invoiceId ?? "").trim();
    if (!id) return;

    let cancelled = false;
    setIntentLoading(true);
    setIntentError("");
    setClientSecret("");
    createInvoicePaymentIntent(id)
      .then(({ clientSecret: secret }) => {
        if (!cancelled) setClientSecret(secret);
      })
      .catch((err) => {
        if (!cancelled) {
          setIntentError(err?.message || "Could not start payment. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setIntentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, invoiceId]);

  const handleClose = () => {
    if (intentLoading) return;
    onClose?.();
  };

  const handlePaid = () => {
    onPaid?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: "#083a6b", pb: 0 }}>
        Pay invoice
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Amount due:{" "}
          <Box component="span" fontWeight={800} color="#083a6b">
            {amountLabel}
          </Box>
        </Typography>
        {businessName ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            To: {businessName}
          </Typography>
        ) : null}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}
        >
          <LockOutlinedIcon sx={{ fontSize: 14 }} aria-hidden />
          Secure payment powered by Stripe — your card details stay with Stripe.
        </Typography>
        {intentError ? (
          <Alert severity="error" sx={{ mb: 2, alignItems: "center" }}>{intentError}</Alert>
        ) : null}
        {intentLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} sx={{ color: "#083a6b" }} />
          </Box>
        ) : null}
        {!intentLoading && clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: { colorPrimary: "#10A86B", borderRadius: "6px" },
              },
            }}
          >
            <InvoicePaymentForm
              amountLabel={amountLabel}
              onSuccess={handlePaid}
              onCancel={handleClose}
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
