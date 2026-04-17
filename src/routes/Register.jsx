import { useState, useEffect, useMemo } from "react";
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
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 0–6 points → label, bar colour, progress % for UI */
function getPasswordStrength(password) {
  const pwd = String(password ?? "");
  if (!pwd) {
    return { pct: 0, label: "", barColor: "grey.400", points: 0 };
  }
  let points = 0;
  if (pwd.length >= 6) points += 1;
  if (pwd.length >= 10) points += 1;
  if (/[a-z]/.test(pwd)) points += 1;
  if (/[A-Z]/.test(pwd)) points += 1;
  if (/[0-9]/.test(pwd)) points += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) points += 1;

  const pct = Math.round((points / 6) * 100);
  let label = "Weak";
  let barColor = "error.main";
  let textColor = "error.main";

  if (pwd.length < 6) {
    label = "Too short";
    barColor = "error.main";
    textColor = "error.main";
  } else if (points <= 2) {
    label = "Weak";
    barColor = "error.main";
    textColor = "error.main";
  } else if (points === 3) {
    label = "Fair";
    barColor = "warning.main";
    textColor = "warning.dark";
  } else if (points <= 5) {
    label = "Good";
    barColor = "info.main";
    textColor = "info.dark";
  } else {
    label = "Strong";
    barColor = "success.main";
    textColor = "success.dark";
  }

  return { pct, label, barColor, textColor, points };
}

function mapAuthError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account already exists with this email. Try logging in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled. Ask an admin to enable it in Firebase.";
    default:
      return "Could not create your account. Please try again.";
  }
}

const Register = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const prefill = location.state?.email;
    if (typeof prefill === "string" && prefill.trim()) {
      setEmail(prefill.trim().toLowerCase());
    }
  }, [location.state]);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const postRegisterState = (() => {
    const raw = location.state?.redirectAfterProfile;
    if (raw === "/secured/billing" || raw === "/secured/settings") {
      return { redirectAfterProfile: raw };
    }
    return undefined;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      await setDoc(doc(db, "users", user.uid), {
        loginEmail: trimmedEmail,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      navigate("/secured/quotes", { replace: true, state: postRegisterState });
    } catch (err) {
      if (err?.code === "auth/email-already-in-use") {
        try {
          const { user: existing } = await signInWithEmailAndPassword(auth, trimmedEmail, password);
          await setDoc(doc(db, "users", existing.uid), {
            loginEmail: trimmedEmail,
            updatedAt: serverTimestamp(),
          }, { merge: true });
          navigate("/secured/quotes", { replace: true, state: postRegisterState });
        } catch (signInErr) {
          if (signInErr?.code === "auth/wrong-password" || signInErr?.code === "auth/invalid-credential") {
            setError("existing-account");
          } else {
            setError(mapAuthError(signInErr?.code) || "Could not sign in. Please try again.");
          }
        }
      } else {
        setError(mapAuthError(err?.code));
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
        Create account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
        Sign up with your email to get started with SendQuote.
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
          {error === "existing-account" ? (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              This email is already registered and the password didn&apos;t match.{" "}
              <Link
                component={RouterLink}
                to="/forgot-password"
                state={{ email }}
                underline="hover"
                fontWeight={600}
              >
                Forgot your password?
              </Link>
            </Alert>
          ) : error ? (
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
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            fullWidth
            required
            margin="normal"
            disabled={submitting}
          />
          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            fullWidth
            required
            margin="normal"
            disabled={submitting}
          />
          {password.length > 0 ? (
            <Box sx={{ mt: 0.5, mb: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={passwordStrength.pct}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  bgcolor: "grey.200",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 1,
                    bgcolor: passwordStrength.barColor,
                  },
                }}
              />
              <Typography
                variant="caption"
                component="div"
                sx={{
                  mt: 0.75,
                  fontWeight: 600,
                  color: passwordStrength.textColor,
                }}
              >
                Password strength: {passwordStrength.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
                Stronger passwords use 10+ characters and mix upper and lower case, numbers, and symbols.
              </Typography>
            </Box>
          ) : null}
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
            {submitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "Create account"
            )}
          </Button>
        </Box>
      </Paper>

      <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
        Already have an account?{" "}
        <Link component={RouterLink} to="/login" underline="hover" fontWeight={600}>
          Log in
        </Link>
      </Typography>
    </Box>
  );
};

export default Register;
