import { useState, useEffect } from "react";
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
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";

function mapAuthError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    default:
      return "Could not sign in. Please try again.";
  }
}

const Login = () => {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Info banner passed via navigation state (e.g. redirected after email change)
  const infoMessage = location.state?.info ?? null;

  useEffect(() => {
    const fromNav = location.state?.email;
    if (typeof fromNav === "string" && fromNav.trim()) {
      setEmail(fromNav.trim().toLowerCase());
    }
  }, [location.pathname, location.state?.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const dest = location.state?.from?.pathname;
      const safe =
        typeof dest === "string" && dest.startsWith("/") && !dest.startsWith("//");
      navigate(safe ? dest : "/secured/quotes", { replace: true });
    } catch (err) {
      setError(mapAuthError(err?.code));
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
        Log in
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
        Log in to your account to send and manage your quotes.
      </Typography>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: "1px solid #E5E7EB",
          borderRadius: 2,
          bgcolor: "#fff",
        }}
      >
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {infoMessage && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {infoMessage}
            </Alert>
          )}
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          ) : null}
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            margin="normal"
            disabled={submitting}
          />
          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            margin="normal"
            disabled={submitting}
          />
          <Box sx={{ textAlign: "right", mt: 0.5, mb: 0.5 }}>
            <Link
              component={RouterLink}
              to="/forgot-password"
              state={{ email }}
              underline="hover"
              variant="body2"
              sx={{ fontSize: "0.8125rem", color: "#083a6b" }}
            >
              Forgot password?
            </Link>
          </Box>
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
            {submitting ? <CircularProgress size={22} color="inherit" /> : "Log in"}
          </Button>
        </Box>
      </Paper>

      <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
        Don&apos;t have an account?{" "}
        <Link component={RouterLink} to="/register" underline="hover" fontWeight={600}>
          Create account
        </Link>
      </Typography>
    </Box>
  );
};

export default Login;
