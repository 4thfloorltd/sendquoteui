import { useState, useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "../../firebase";

function getPasswordStrength(password) {
  const pwd = String(password ?? "");
  if (!pwd) return { pct: 0, label: "", barColor: "grey.400", textColor: "text.secondary" };
  let pts = 0;
  if (pwd.length >= 6) pts++;
  if (pwd.length >= 10) pts++;
  if (/[a-z]/.test(pwd)) pts++;
  if (/[A-Z]/.test(pwd)) pts++;
  if (/[0-9]/.test(pwd)) pts++;
  if (/[^A-Za-z0-9]/.test(pwd)) pts++;
  const pct = Math.round((pts / 6) * 100);
  if (pwd.length < 6) return { pct, label: "Too short",  barColor: "error.main",   textColor: "error.main" };
  if (pts <= 2)       return { pct, label: "Weak",       barColor: "error.main",   textColor: "error.main" };
  if (pts === 3)      return { pct, label: "Fair",       barColor: "warning.main", textColor: "warning.dark" };
  if (pts <= 5)       return { pct, label: "Good",       barColor: "info.main",    textColor: "info.dark" };
  return               { pct, label: "Strong",     barColor: "success.main", textColor: "success.dark" };
}

const ResetPassword = () => {
  const [searchParams]       = useSearchParams();
  const navigate             = useNavigate();
  const oobCode              = searchParams.get("oobCode") ?? "";

  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting]         = useState(false);
  const [done, setDone]                     = useState(false);
  const [error, setError]                   = useState("");

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!oobCode) {
      setError("Invalid or expired reset link. Please request a new one.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, newPassword);
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    } catch (err) {
      if (err?.code === "auth/invalid-action-code" || err?.code === "auth/expired-action-code") {
        setError("This reset link has expired or already been used. Please request a new one.");
      } else if (err?.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!oobCode) {
    return (
      <Box sx={{ maxWidth: 440, mx: "auto", px: 2, py: { xs: 4, sm: 6 }, textAlign: "center" }}>
        <Typography variant="h5" fontWeight={700} color="#083a6b" sx={{ mb: 2 }}>
          Invalid reset link
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This link is missing required information. Please request a new password reset.
        </Typography>
        <Button
          component={RouterLink}
          to="/forgot-password"
          variant="contained"
          sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}
        >
          Request new link
        </Button>
      </Box>
    );
  }

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
        Set new password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
        Choose a strong password for your account.
      </Typography>

      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid #E5E7EB", borderRadius: 2, bgcolor: "#fff" }}
      >
        {done ? (
          <Alert severity="success">
            Password updated! Redirecting you to log in…
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                {error}{" "}
                {(error.includes("expired") || error.includes("used")) && (
                  <Link component={RouterLink} to="/forgot-password" underline="hover" fontWeight={600}>
                    Request a new link.
                  </Link>
                )}
              </Alert>
            )}
            <TextField
              label="New password"
              type="password"
              name="new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
              fullWidth
              required
              margin="normal"
              autoFocus
              disabled={submitting}
            />
            {newPassword.length > 0 && (
              <Box sx={{ mt: 0.5, mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={strength.pct}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    bgcolor: "grey.200",
                    "& .MuiLinearProgress-bar": { borderRadius: 1, bgcolor: strength.barColor },
                  }}
                />
                <Typography variant="caption" sx={{ mt: 0.5, display: "block", fontWeight: 600, color: strength.textColor }}>
                  Password strength: {strength.label}
                </Typography>
              </Box>
            )}
            <TextField
              label="Confirm new password"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              fullWidth
              required
              margin="normal"
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
              {submitting ? <CircularProgress size={22} color="inherit" /> : "Reset password"}
            </Button>
          </Box>
        )}
      </Paper>

      {!done && (
        <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
          <Link component={RouterLink} to="/login" underline="hover" fontWeight={600}>
            Back to log in
          </Link>
        </Typography>
      )}
    </Box>
  );
};

export default ResetPassword;
