import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
  const location                = useLocation();
  const [email, setEmail]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    const prefill = location.state?.email;
    if (typeof prefill === "string" && prefill.trim()) {
      setEmail(prefill.trim().toLowerCase());
    }
  }, [location.state?.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, trimmed, {
        // continueUrl: where Firebase redirects after the reset is complete.
        // Once the custom action URL is set in Firebase Console to /reset-password,
        // the oobCode lands there and this becomes the post-reset redirect.
        url: `${window.location.origin}/login`,
      });
      setSent(true);
    } catch (err) {
      // Intentionally don't reveal whether the email exists.
      if (err?.code === "auth/user-not-found" || err?.code === "auth/invalid-email") {
        setSent(true);
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 440,
        mx: "auto",
        px: 2,
        py: { xs: 4, sm: 6 },
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: 800, color: "#083a6b", mb: 1, textAlign: "center" }}
      >
        Forgot password?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
        Enter your email and we&apos;ll send you a link to reset your password.
      </Typography>

      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 2, bgcolor: "#fff" }}
      >
        {sent ? (
          <Alert severity="success" sx={{ mb: 0, alignItems: "center" }}>
            If an account with that email exists, a reset link has been sent.
            Check your inbox (and spam folder).
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {error && (
              <Alert severity="error" sx={{ mb: 2, alignItems: "center" }} onClose={() => setError("")}>
                {error}
              </Alert>
            )}
            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              fullWidth
              required
              margin="normal"
              autoFocus
              disabled={submitting}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={submitting}
              sx={{
                mt: 2,
                py: 1.25,
                textTransform: "none",
                fontWeight: 600,
                bgcolor: "#083a6b",
                "&:hover": { bgcolor: "#062d52" },
              }}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : "Send reset link"}
            </Button>
          </Box>
        )}
      </Paper>

      <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
        <Link component={RouterLink} to="/login" underline="hover" fontWeight={600}>
          Back to log in
        </Link>
      </Typography>
    </Box>
  );
};

export default ForgotPassword;
