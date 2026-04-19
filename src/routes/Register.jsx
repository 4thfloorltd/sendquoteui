import { useState, useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import {
  sendQuoteVerificationCode,
  verifyQuoteVerificationCode,
} from "../api/quoteVerification";
import { emailHasRegisteredAccount } from "../utils/userEmailAvailability";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_MS = 60_000;

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

function mapVerifyError(err) {
  const code = String(err?.code || "");
  if (code === "functions/permission-denied") return "Invalid verification code. Please try again.";
  if (code === "functions/deadline-exceeded") return "This code has expired. Request a new one.";
  if (code === "functions/failed-precondition") return "This code has already been used. Request a new one.";
  if (code === "functions/resource-exhausted") return "Too many invalid attempts. Request a new code.";
  if (code === "functions/not-found") return "Verification session not found. Request a new code.";
  return err?.message || "Could not verify the code. Please try again.";
}

const Register = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Step 1 state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 2 state
  const [step, setStep] = useState("credentials"); // "credentials" | "verify"
  const [challengeId, setChallengeId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendAvailableAtMs, setResendAvailableAtMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const prefill = location.state?.email;
    if (typeof prefill === "string" && prefill.trim()) {
      setEmail(prefill.trim().toLowerCase());
    }
  }, [location.state]);

  // Tick every second while the resend cooldown is counting down.
  useEffect(() => {
    if (step !== "verify") return undefined;
    if (resendAvailableAtMs <= Date.now()) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step, resendAvailableAtMs]);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const postRegisterState = (() => {
    const raw = location.state?.redirectAfterProfile;
    if (raw === "/secured/billing" || raw === "/secured/profile" || raw === "/secured/settings") {
      return { redirectAfterProfile: raw };
    }
    return undefined;
  })();

  const resendSecondsLeft = Math.max(0, Math.ceil((resendAvailableAtMs - nowMs) / 1000));
  const canResend = !resending && resendSecondsLeft === 0;

  // Hold on to the credentials across step 1 → step 2 so we can finish
  // registration after the code is verified. Password is intentionally not
  // kept in state to keep it out of React devtools longer than necessary.
  const pendingPasswordRef = useRef("");

  const createOrLinkAccount = async (trimmedEmail, passwordValue) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, trimmedEmail, passwordValue);
      await setDoc(doc(db, "users", user.uid), {
        loginEmail: trimmedEmail,
        emailVerified: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      navigate("/secured/quotes", { replace: true, state: postRegisterState });
      return;
    } catch (err) {
      if (err?.code !== "auth/email-already-in-use") {
        throw err;
      }
    }
    // Email already has an account — try signing in with the supplied password.
    try {
      const { user: existing } = await signInWithEmailAndPassword(auth, trimmedEmail, passwordValue);
      await setDoc(doc(db, "users", existing.uid), {
        loginEmail: trimmedEmail,
        emailVerified: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      navigate("/secured/quotes", { replace: true, state: postRegisterState });
    } catch (signInErr) {
      if (signInErr?.code === "auth/wrong-password" || signInErr?.code === "auth/invalid-credential") {
        const err = new Error("existing-account");
        err.kind = "existing-account";
        throw err;
      }
      throw signInErr;
    }
  };

  const requestVerificationCode = async (trimmedEmail) => {
    const data = await sendQuoteVerificationCode(trimmedEmail);
    setChallengeId(String(data?.challengeId ?? ""));
    setVerifyCode("");
    setResendAvailableAtMs(Date.now() + RESEND_COOLDOWN_MS);
    setNowMs(Date.now());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const data = new FormData(e.currentTarget);
    const trimmedEmail = String(data.get("email") ?? "").trim().toLowerCase();
    const passwordValue = String(data.get("password") ?? "");

    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (passwordValue.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (trimmedEmail !== email) setEmail(trimmedEmail);
    if (passwordValue !== password) setPassword(passwordValue);
    pendingPasswordRef.current = passwordValue;

    setSubmitting(true);
    try {
      const alreadyRegistered = await emailHasRegisteredAccount(auth, db, trimmedEmail);
      if (alreadyRegistered) {
        setError(mapAuthError("auth/email-already-in-use"));
        return;
      }
      await requestVerificationCode(trimmedEmail);
      setStep("verify");
    } catch (err) {
      const code = String(err?.code || "");
      if (code === "functions/resource-exhausted") {
        // Backend cooldown — skip straight to step 2 and surface the wait.
        setResendAvailableAtMs(Date.now() + RESEND_COOLDOWN_MS);
        setNowMs(Date.now());
        setStep("verify");
        setVerifyError("Please wait a minute before requesting another code.");
      } else {
        setError(err?.message || "Could not send verification code. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifyError("");

    const data = new FormData(e.currentTarget);
    const codeValue = String(data.get("code") ?? "").replace(/\D/g, "").slice(0, 6);

    if (codeValue.length !== 6) {
      setVerifyError("Enter the 6-digit code from your email.");
      return;
    }
    if (!challengeId) {
      setVerifyError("Verification session expired. Please request a new code.");
      return;
    }

    setVerifying(true);
    try {
      await verifyQuoteVerificationCode({ challengeId, email, code: codeValue });
      await createOrLinkAccount(email, pendingPasswordRef.current);
    } catch (err) {
      if (err?.kind === "existing-account") {
        setError("existing-account");
        setStep("credentials");
      } else if (err?.code?.startsWith?.("auth/")) {
        setError(mapAuthError(err.code));
        setStep("credentials");
      } else {
        setVerifyError(mapVerifyError(err));
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setVerifyError("");
    setResending(true);
    try {
      await requestVerificationCode(email);
    } catch (err) {
      const code = String(err?.code || "");
      if (code === "functions/resource-exhausted") {
        setResendAvailableAtMs(Date.now() + RESEND_COOLDOWN_MS);
        setNowMs(Date.now());
        setVerifyError("Please wait a minute before requesting another code.");
      } else {
        setVerifyError(err?.message || "Could not resend code. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleBackToCredentials = () => {
    setVerifyError("");
    setStep("credentials");
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
      {step === "credentials" ? (
        <>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 800, color: "#083a6b", mb: 1, textAlign: "center" }}
          >
            Create account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
            Sign up with your email to get started with <strong>SendQuote</strong>.
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
                <Alert severity="error" sx={{ mb: 2, alignItems: "center" }} onClose={() => setError("")}>
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
                <Alert severity="error" sx={{ mb: 2, alignItems: "center" }} onClose={() => setError("")}>
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
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
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
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                        disabled={submitting}
                        sx={{
                          width: 32,
                          height: 32,
                          minWidth: 32,
                          padding: 0,
                          borderRadius: "50%",
                          "&.Mui-focusVisible": {
                            outline: "none",
                            boxShadow: "0 0 0 2px #083a6b",
                            backgroundColor: "rgba(8, 58, 107, 0.08)",
                          },
                        }}
                      >
                        {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 2, textAlign: "center", display: "block", lineHeight: 1.5, px: 0.5 }}
            >
              By creating an account you agree to our{" "}
              <Link
                component={RouterLink}
                to="/terms"
                underline="hover"
                fontWeight={600}
                sx={{ color: "#083a6b", "&:hover": { color: "#062d52" } }}
              >
                Terms
              </Link>
              {" and "}
              <Link
                component={RouterLink}
                to="/privacy"
                underline="hover"
                fontWeight={600}
                sx={{ color: "#083a6b", "&:hover": { color: "#062d52" } }}
              >
                Privacy Policy
              </Link>
              .
            </Typography>
          </Paper>

          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            Already have an account?{" "}
            <Link component={RouterLink} to="/login" underline="hover" fontWeight={600}>
              Log in
            </Link>
          </Typography>
        </>
      ) : (
        <>
          <Box sx={{ textAlign: "center", mb: 1 }}>
            <MarkEmailReadOutlinedIcon sx={{ fontSize: 44, color: "#083a6b" }} />
          </Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 800, color: "#083a6b", mb: 1, textAlign: "center" }}
          >
            Verify your email
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
            We&apos;ve sent a 6-digit code to <strong>{email}</strong>. Enter it below to
            finish creating your account.
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
            <Box component="form" onSubmit={handleVerify} noValidate>
              {verifyError ? (
                <Alert severity="error" sx={{ mb: 2, alignItems: "center" }} onClose={() => setVerifyError("")}>
                  {verifyError}
                </Alert>
              ) : null}

              <TextField
                label="Verification code"
                type="text"
                name="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                value={verifyCode}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerifyCode(digits);
                  if (verifyError) setVerifyError("");
                }}
                fullWidth
                required
                margin="normal"
                disabled={verifying}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  maxLength: 6,
                  style: {
                    letterSpacing: "0.4em",
                    textAlign: "center",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: "1.25rem",
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={verifying || verifyCode.length !== 6}
                sx={{
                  mt: 2,
                  py: 1.25,
                  textTransform: "none",
                  fontWeight: 600,
                  bgcolor: "#083a6b",
                  "&:hover": { bgcolor: "#062d52" },
                }}
              >
                {verifying ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  "Verify & create account"
                )}
              </Button>

              <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button
                  onClick={handleBackToCredentials}
                  disabled={verifying}
                  size="small"
                  sx={{ textTransform: "none", color: "text.secondary" }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleResend}
                  disabled={!canResend}
                  size="small"
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  {resending
                    ? <CircularProgress size={14} sx={{ mr: 1 }} />
                    : null}
                  {resendSecondsLeft > 0
                    ? `Resend in ${resendSecondsLeft}s`
                    : "Resend code"}
                </Button>
              </Box>
            </Box>
          </Paper>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block", textAlign: "center" }}>
            Didn&apos;t get the email? Check your spam folder, or{" "}
            <Link
              component="button"
              type="button"
              onClick={handleBackToCredentials}
              underline="hover"
              sx={{ fontWeight: 600 }}
            >
              use a different email
            </Link>.
          </Typography>
        </>
      )}
    </Box>
  );
};

export default Register;
