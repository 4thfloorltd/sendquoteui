import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { doc, getDoc, setDoc, deleteDoc, deleteField, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, verifyBeforeUpdateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "../../../firebase";
import { useAddressAutocomplete } from "../../hooks/useAddressAutocomplete";
import { isEmailClaimedByAnotherUser } from "../../utils/userEmailAvailability";
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../../constants/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Settings = () => {
  const navigate = useNavigate();

  // Business profile
  const [uid, setUid]                         = useState(null);
  const [authEmail, setAuthEmail]             = useState("");
  const [originalBizEmail, setOriginalBizEmail] = useState("");
  const [bizName, setBizName]                 = useState("");
  const [bizEmail, setBizEmail]               = useState("");
  const [bizAddress, setBizAddress]           = useState("");
  const [addressFieldFocused, setAddressFieldFocused] = useState(false);
  const [profileLoading, setProfileLoading]   = useState(true);
  const [profileSaving, setProfileSaving]     = useState(false);
  const [profileErrors, setProfileErrors]     = useState({});
  const [editingProfile, setEditingProfile]   = useState(false);
  const profileSnapshot = useRef({});

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving]               = useState(false);
  const [pwErrors, setPwErrors]               = useState({});

  // Re-auth dialog for email change
  const [reauthOpen, setReauthOpen]                       = useState(false);
  const [reauthPassword, setReauthPassword]               = useState("");
  const [reauthError, setReauthError]                     = useState("");
  const [reauthLoading, setReauthLoading]                 = useState(false);
  const [pendingEmailSave, setPendingEmailSave]           = useState(null);
  // Tracks that a verification email has been sent but not yet actioned.
  const [pendingVerification, setPendingVerification]     = useState(null); // { email, resending }
  const [resendCooldown, setResendCooldown]               = useState(0);    // seconds remaining


  // Delete account — 2-step: confirm → password
  const [deleteOpen, setDeleteOpen]         = useState(false);
  const [deleteStep, setDeleteStep]         = useState(1); // 1 = confirm, 2 = password
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError]       = useState("");
  const [deleteLoading, setDeleteLoading]   = useState(false);

  const openDeleteDialog = () => {
    setDeleteStep(1);
    setDeleteConfirmText("");
    setDeletePassword("");
    setDeleteError("");
    setDeleteOpen(true);
  };
  const closeDeleteDialog = () => {
    if (deleteLoading) return;
    setDeleteOpen(false);
  };

  // Tax settings
  const [vatRegistered, setVatRegistered] = useState(true);
  const [vatSaving, setVatSaving] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showSnack = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  const {
    options: addressOptions,
    loading: addressLoading,
    resolving: addressResolving,
    scheduleSearch: scheduleAddressSearch,
    clearOptions: clearAddressOptions,
    finalizeSelection: finalizeAddressSelection,
  } = useAddressAutocomplete();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setProfileLoading(false); return; }
      const authUserEmail = user.email ?? "";
      setUid(user.uid);
      setAuthEmail(authUserEmail);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setBizName(d.businessName    ?? "");
          setBizAddress(d.businessAddress ?? "");
          setVatRegistered(d.vatRegistered ?? true);

          const authLower  = authUserEmail.toLowerCase();
          const pending    = d.pendingEmailChange?.toLowerCase();
          const storedBiz  = (d.businessEmail ?? "").toLowerCase();
          const storedLogin = (d.loginEmail    ?? "").toLowerCase();

          // Determine the email to show in the form.  Layout.jsx commits the
          // pendingEmailChange when the user signs in, so by the time Settings
          // loads the field may already be cleared.  Fall back gracefully.
          const displayEmail = d.businessEmail ?? authUserEmail;
          setBizEmail(displayEmail);
          setOriginalBizEmail(displayEmail);

          // If businessEmail/loginEmail are still out of sync with Auth email and
          // there is no pending change, sync them now (covers legacy records).
          if (!pending && authLower && storedBiz && storedBiz !== authLower) {
            setDoc(doc(db, "users", user.uid), {
              businessEmail: authUserEmail,
              ...(storedLogin !== authLower ? { loginEmail: authUserEmail } : {}),
              updatedAt: serverTimestamp(),
            }, { merge: true }).catch((err) => console.error("businessEmail sync failed", err));
            setBizEmail(authUserEmail);
            setOriginalBizEmail(authUserEmail);
          }

          // If pendingEmailChange matches the current auth email the user already
          // clicked the verification link — commit and clear (Layout.jsx may have
          // already done this; setDoc is idempotent).
          if (pending && pending === authLower) {
            setBizEmail(authUserEmail);
            setOriginalBizEmail(authUserEmail);
            setDoc(doc(db, "users", user.uid), {
              businessEmail:      authUserEmail,
              loginEmail:         authUserEmail,
              pendingEmailChange: deleteField(),
              updatedAt:          serverTimestamp(),
            }, { merge: true }).catch((err) => console.error("Settings email commit failed", err));
            setPendingVerification(null);
          } else if (!pending) {
            // No pending change — clear any stale banner.
            setPendingVerification(null);
          }
        } else {
          setBizEmail(authUserEmail);
          setOriginalBizEmail(authUserEmail);
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setProfileLoading(false);
      }
    });
    return unsub;
  }, []);

  const emailChanged = bizEmail.trim().toLowerCase() !== originalBizEmail.toLowerCase();

  const handleSaveProfile = async () => {
    const errs = {};
    if (!bizName.trim())  errs.bizName  = "Business name is required.";
    if (!bizEmail.trim()) errs.bizEmail = "Email address is required.";
    else if (!EMAIL_RE.test(bizEmail)) errs.bizEmail = "Enter a valid email address.";
    setProfileErrors(errs);
    if (Object.keys(errs).length) return;

    const normalizedEmail = bizEmail.trim().toLowerCase();
    setProfileSaving(true);

    // Check email availability before opening the reauth / save flow.
    // isEmailClaimedByAnotherUser never throws — it returns false on any
    // internal error so a Firestore permission issue never blocks a valid save.
    const claimed = await isEmailClaimedByAnotherUser(auth, db, normalizedEmail, uid);
    if (claimed) {
      setProfileErrors({ bizEmail: "This email is already in use by another account." });
      setProfileSaving(false);
      return;
    }

    // Guard: if this email is already awaiting verification, don't let it be
    // written directly — treat it as a new email change requiring reauth.
    const isPendingEmail = pendingVerification?.email && normalizedEmail === pendingVerification.email;

    try {
      if (emailChanged || isPendingEmail) {
        // Save name & address immediately; email update is handled via Firebase
        // verification link in the reauth step.
        await setDoc(doc(db, "users", uid), {
          businessName:    bizName.trim(),
          businessAddress: bizAddress.trim(),
          profileComplete: true,
          updatedAt:       serverTimestamp(),
        }, { merge: true });

        setPendingEmailSave(normalizedEmail);
        setReauthPassword("");
        setReauthError("");
        setReauthOpen(true);
        setProfileSaving(false);
        return;
      }

      await setDoc(doc(db, "users", uid), {
        businessName:    bizName.trim(),
        businessEmail:   normalizedEmail,
        businessAddress: bizAddress.trim(),
        profileComplete: true,
        loginEmail:      auth.currentUser?.email?.toLowerCase() ?? "",
        updatedAt:       serverTimestamp(),
      }, { merge: true });

      setOriginalBizEmail(normalizedEmail);
      setEditingProfile(false);
      showSnack("Business profile saved.");
    } catch (e) {
      console.error("Profile save failed", e);
      showSnack("Failed to save profile. Please try again.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleReauthAndUpdateEmail = async () => {
    if (!reauthPassword) { setReauthError("Password is required."); return; }
    setReauthLoading(true);
    setReauthError("");
    try {
      const credential = EmailAuthProvider.credential(authEmail, reauthPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      const nextEmail = pendingEmailSave;

      // verifyBeforeUpdateEmail sends a link to the new address.  Auth email
      // only changes after the user clicks it.  We record the pending address in
      // Firestore so the banner survives page navigation and onAuthStateChanged
      // can finalise businessEmail / loginEmail once the link is clicked.
      await verifyBeforeUpdateEmail(auth.currentUser, nextEmail, {
        url: `${window.location.origin}/secured/settings`,
      });

      await setDoc(doc(db, "users", auth.currentUser.uid), {
        pendingEmailChange: nextEmail,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Close the edit form and revert the displayed email to the verified one.
      // Do NOT update originalBizEmail to the pending address — keeping it at
      // the verified value ensures emailChanged stays true if the user tries to
      // save the pending email again, preventing it from being written without
      // completing verification.
      setReauthOpen(false);
      setReauthPassword("");
      setPendingEmailSave(null);
      setEditingProfile(false);
      setBizEmail(originalBizEmail);
      setPendingVerification({ email: nextEmail, resending: false });
      startResendCooldown();
    } catch (e) {
      console.error("Re-auth / email update failed", e.code, e.message, e);
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setReauthError("Incorrect password.");
      } else if (e.code === "auth/email-already-in-use") {
        setReauthError("This email is already in use by another account.");
      } else if (e.code === "auth/too-many-requests") {
        setReauthError("Too many attempts. Please wait a few minutes and try again.");
      } else if (e.code === "auth/requires-recent-login") {
        setReauthError("Session expired. Please sign out and sign back in, then try again.");
      } else {
        setReauthError(`Something went wrong (${e.code ?? "unknown"}). Please try again.`);
      }
    } finally {
      setReauthLoading(false);
    }
  };

  const RESEND_COOLDOWN_SEC = 120; // 2 minutes between resends to protect rate limit

  const startResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SEC);
    const interval = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(interval); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const handleResendVerification = async () => {
    if (!pendingVerification?.email || !auth.currentUser || resendCooldown > 0) return;
    setPendingVerification((p) => ({ ...p, resending: true }));
    try {
      await verifyBeforeUpdateEmail(auth.currentUser, pendingVerification.email, {
        url: `${window.location.origin}/secured/settings`,
      });
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        pendingEmailChange: pendingVerification.email,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      startResendCooldown();
      showSnack("Verification email resent. Check your inbox and spam / junk folder.", "success");
    } catch (e) {
      if (e.code === "auth/too-many-requests") {
        showSnack("Too many attempts today. Firebase limits verification emails to ~5 per day. Please try again tomorrow.", "warning");
      } else {
        showSnack("Failed to resend. Please try again.", "error");
      }
      console.error("Resend verification failed", e.code, e);
    } finally {
      setPendingVerification((p) => ({ ...p, resending: false }));
    }
  };

  const handleChangePassword = async () => {
    const errs = {};
    if (!currentPassword) errs.currentPassword = "Current password is required.";
    if (newPassword.length < 6) errs.newPassword = "New password must be at least 6 characters.";
    if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match.";
    setPwErrors(errs);
    if (Object.keys(errs).length) return;

    setPwSaving(true);
    try {
      const credential = EmailAuthProvider.credential(authEmail, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSnack("Password updated successfully.");
    } catch (e) {
      console.error("Password change failed", e);
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setPwErrors({ currentPassword: "Incorrect current password." });
      } else {
        showSnack("Failed to update password. Please try again.", "error");
      }
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { setDeleteError("Password is required."); return; }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const credential = EmailAuthProvider.credential(authEmail, deletePassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Delete all Firestore data and the Auth account via Cloud Function.
      // Using the Admin SDK server-side guarantees the deletes succeed
      // regardless of client-side security rules and never leave orphan docs.
      const deleteUserData = httpsCallable(getFunctions(), "deleteUserData");
      await deleteUserData({});

      // Sign out the client session immediately so the Firebase Auth SDK
      // stops seeing the user as logged in before we navigate away.
      // Without this, onAuthStateChanged fires with the old user object and
      // Layout / Dashboard components may recreate Firestore docs.
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (e) {
      console.error("Delete account failed", e);
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setDeleteError("Incorrect password. Please try again.");
      } else {
        setDeleteError("Something went wrong. Please try again.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleVatRegistered = async (checked) => {
    setVatRegistered(checked);
    if (!uid) return;
    setVatSaving(true);
    try {
      await setDoc(doc(db, "users", uid), { vatRegistered: checked, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error("Failed to save VAT setting", e);
      setVatRegistered(!checked);
      showSnack("Failed to save tax setting. Please try again.", "error");
    } finally {
      setVatSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: APP_PAGE_CONTENT_MAX_WIDTH, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} color="#083a6b" sx={{ mb: 0.5 }}>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Manage your business profile and account security.
      </Typography>

      {/* ── Business profile ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6" fontWeight={700} color="#083a6b">
          Business profile
        </Typography>
        {!editingProfile && (
          <Typography
            variant="body2"
            onClick={() => {
              profileSnapshot.current = { bizName, bizEmail, bizAddress };
              setEditingProfile(true);
            }}
            sx={{ color: "#083a6b", fontWeight: 500, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
          >
            Edit
          </Typography>
        )}
      </Box>

      {/* ── Read-only summary ── */}
      {!editingProfile && (
        <Box sx={{ border: "1px solid #E5E7EB", borderRadius: 2, bgcolor: "#F8FAFC", px: 2.5, py: 2, mb: 3 }}>
          {[
            { label: "Business name",    value: bizName    },
            { label: "Business email",   value: bizEmail   },
            { label: "Business address", value: bizAddress },
          ].map(({ label, value }, i, arr) => (
            <Box key={label} sx={{ display: "flex", gap: 2, py: 1, borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <Typography variant="body2" sx={{ color: "#94A3B8", fontWeight: 600, minWidth: 130, flexShrink: 0 }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ color: value ? "#111827" : "#CBD5E1", whiteSpace: "pre-wrap" }}>
                {value || "—"}
              </Typography>
            </Box>
          ))}
          {pendingVerification && (
            <Alert
              severity="info"
              sx={{ mt: 1.5, fontSize: "0.82rem", alignItems: "flex-start" }}
              onClose={() => {
                setPendingVerification(null);
                if (uid) setDoc(doc(db, "users", uid), { pendingEmailChange: deleteField(), updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
              }}
              action={
                <Button
                  size="small"
                  color="inherit"
                  disabled={pendingVerification.resending || resendCooldown > 0}
                  onClick={handleResendVerification}
                  sx={{ whiteSpace: "nowrap", fontWeight: 600 }}
                >
                  {pendingVerification.resending ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
                </Button>
              }
            >
              A verification link was sent to <strong>{pendingVerification.email}</strong>.
              Check your inbox and <strong>spam / junk</strong> folder.
            </Alert>
          )}
        </Box>
      )}

      {/* ── Edit form ── */}
      {editingProfile && (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Business name"
            value={bizName}
            onChange={(e) => { setBizName(e.target.value); setProfileErrors((p) => { const n = { ...p }; delete n.bizName; return n; }); }}
            error={!!profileErrors.bizName}
            helperText={profileErrors.bizName}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Business email"
            type="email"
            value={bizEmail}
            onChange={(e) => { setBizEmail(e.target.value); setProfileErrors((p) => { const n = { ...p }; delete n.bizEmail; return n; }); }}
            error={!!profileErrors.bizEmail}
            helperText={profileErrors.bizEmail}
            fullWidth
            required
          />
          {emailChanged && (
            <Alert severity="warning" sx={{ mt: 1, py: 0.5, fontSize: "0.8rem" }}>
              Updating your business email will also update your account login email.
            </Alert>
          )}
        </Grid>
        <Grid item xs={12}>
          <Autocomplete
              freeSolo
              options={addressOptions}
              getOptionLabel={(option) => typeof option === "string" ? option : option.label}
              isOptionEqualToValue={(a, b) => {
                if (typeof a === "string" && typeof b === "string") return a === b;
                return (a && b && typeof a === "object" && typeof b === "object") ? a.id === b.id : false;
              }}
              filterOptions={(opts) => opts}
              inputValue={bizAddress}
              onInputChange={(e, newInput, reason) => {
                if (reason === "input" || reason === "clear") {
                  setBizAddress(newInput);
                  scheduleAddressSearch(newInput);
                } else if (reason === "reset") {
                  setBizAddress(newInput);
                  clearAddressOptions();
                }
              }}
              onChange={async (e, newValue) => {
                clearAddressOptions();
                const text = await finalizeAddressSelection(newValue);
                if (text !== null) setBizAddress(text);
              }}
              loading={addressLoading || addressResolving}
              loadingText={addressResolving ? "Fetching full address…" : "Searching…"}
              fullWidth
              renderOption={(props, option) => {
                if (typeof option === "string") return <li {...props}>{option}</li>;
                return (
                  <li {...props}>
                    <Box sx={{ py: 0.75, display: "flex", flexDirection: "column", gap: 0.25 }}>
                      <Typography variant="body2" fontWeight={600}>{option.primary}</Typography>
                      {option.subtitle && (
                        <Typography variant="caption" color="text.secondary">{option.subtitle}</Typography>
                      )}
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => {
                const addrFilled = Boolean(bizAddress.trim());
                return (
                <TextField
                  {...params}
                  label="Business address"
                  multiline
                  maxRows={4}
                  fullWidth
                  placeholder="Start typing your address…"
                  InputLabelProps={{
                    shrink: addressFieldFocused || addrFilled,
                    ...params.InputLabelProps,
                  }}
                  InputProps={{
                    ...params.InputProps,
                    onFocus: (e) => {
                      setAddressFieldFocused(true);
                      params.InputProps?.onFocus?.(e);
                    },
                    onBlur: (e) => {
                      setAddressFieldFocused(false);
                      params.InputProps?.onBlur?.(e);
                    },
                    endAdornment: (
                      <>
                        {(addressLoading || addressResolving) && (
                          <CircularProgress color="inherit" size={20} sx={{ mr: 1 }} />
                        )}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
                );
              }}
          />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="contained"
              onClick={handleSaveProfile}
              disabled={profileSaving}
              sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}
            >
              {profileSaving ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Save profile"}
            </Button>
            <Button
              variant="outlined"
                onClick={() => {
                  const s = profileSnapshot.current;
                  setBizName(s.bizName ?? "");
                  setBizEmail(s.bizEmail ?? "");
                  setBizAddress(s.bizAddress ?? "");
                  setProfileErrors({});
                  setEditingProfile(false);
                }}
              disabled={profileSaving}
              sx={{ textTransform: "none", color: "text.secondary", borderColor: "#E2E8F0" }}
            >
              Cancel
            </Button>
          </Box>
        </Grid>
      </Grid>
      )}

      <Divider sx={{ my: 4 }} />

      {/* ── Tax settings ── */}
      <Typography variant="h6" fontWeight={700} color="#083a6b" sx={{ mb: 2 }}>
        Tax settings
      </Typography>
      <Box sx={{ border: "1px solid #E5E7EB", borderRadius: 2, bgcolor: "#F8FAFC", px: 2.5, py: 2, mb: 0 }}>
        <FormControlLabel
          control={
            <Switch
              checked={vatRegistered}
              onChange={(e) => handleToggleVatRegistered(e.target.checked)}
              disabled={profileLoading || vatSaving}
            />
          }
          label={
            <Box sx={{ ml: 0.5 }}>
              <Typography variant="body2" fontWeight={600} color="#111827">
                VAT registered
              </Typography>
              <Typography variant="caption" color="text.secondary">
                When enabled, a VAT % field appears on each line item and VAT is shown in totals.
              </Typography>
            </Box>
          }
          labelPlacement="end"
          sx={{ m: 0, alignItems: "flex-start" }}
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* ── Account / password ── */}
      <Typography variant="h6" fontWeight={700} color="#083a6b" sx={{ mb: 2 }}>
        Change password
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setPwErrors((p) => { const n = { ...p }; delete n.currentPassword; return n; }); }}
            error={!!pwErrors.currentPassword}
            helperText={pwErrors.currentPassword}
            fullWidth
            autoComplete="current-password"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setPwErrors((p) => { const n = { ...p }; delete n.newPassword; return n; }); }}
            error={!!pwErrors.newPassword}
            helperText={pwErrors.newPassword}
            fullWidth
            autoComplete="new-password"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setPwErrors((p) => { const n = { ...p }; delete n.confirmPassword; return n; }); }}
            error={!!pwErrors.confirmPassword}
            helperText={pwErrors.confirmPassword}
            fullWidth
            autoComplete="new-password"
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="outlined"
            onClick={handleChangePassword}
            disabled={pwSaving}
            sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", "&:hover": { bgcolor: "#F0F4F8" } }}
          >
            {pwSaving ? <CircularProgress size={20} /> : "Update password"}
          </Button>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* ── Sign out ── */}
      <Typography variant="h6" fontWeight={700} color="#083a6b" sx={{ mb: 0.5 }}>
        Sign out
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        You are signed in as <strong>{authEmail}</strong>.
      </Typography>
      <Button
        variant="outlined"
        onClick={async () => { await signOut(auth); navigate("/"); }}
        sx={{
          textTransform: "none",
          fontWeight: 600,
          borderColor: "#083a6b",
          color: "#083a6b",
          "&:hover": { bgcolor: "#F0F4F8" },
        }}
      >
        Sign out
      </Button>

      <Divider sx={{ my: 4 }} />

      {/* ── Danger zone ── */}
      <Typography variant="h6" fontWeight={700} color="#EF4444" sx={{ mb: 0.5 }}>
        Delete Account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Permanently delete your account. This action cannot be undone.
      </Typography>
      <Button
        variant="outlined"
        onClick={openDeleteDialog}
        sx={{
          textTransform: "none",
          fontWeight: 600,
          color: "#EF4444",
          borderColor: "#EF4444",
          "&:hover": { bgcolor: "#FEF2F2", borderColor: "#DC2626" },
        }}
      >
        Delete my account
      </Button>

      {/* Delete account — step 1: consequences + typed confirmation */}
      <Dialog open={deleteOpen && deleteStep === 1} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#EF4444" }}>
          Are you sure?
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Deleting your account is <strong>permanent and cannot be undone</strong>. The following will be removed immediately:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, color: "text.secondary" }}>
            {[
              "Your account and login credentials",
              "Your business profile",
              "All quotes you have created",
              "Your usage history",
            ].map((item) => (
              <Typography key={item} component="li" variant="body2" sx={{ mb: 0.5 }}>
                {item}
              </Typography>
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary">
            Type <strong>DELETE</strong> below to continue.
          </Typography>
          <TextField
            placeholder="Type DELETE to confirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
            fullWidth
            autoFocus
            size="small"
            onKeyDown={(e) => {
              if (e.key === "Enter" && deleteConfirmText === "DELETE") {
                setDeleteStep(2);
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={closeDeleteDialog} sx={{ textTransform: "none", color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={deleteConfirmText !== "DELETE"}
            onClick={() => { setDeleteError(""); setDeletePassword(""); setDeleteStep(2); }}
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#EF4444", "&:hover": { bgcolor: "#DC2626" }, "&.Mui-disabled": { bgcolor: "#FECACA", color: "#fff" } }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete account — step 2: password confirmation */}
      <Dialog open={deleteOpen && deleteStep === 2} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#EF4444" }}>
          Enter your password
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your current password to permanently delete your account.
          </Typography>
          {deleteError && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{deleteError}</Alert>}
          <TextField
            label="Password"
            type="password"
            value={deletePassword}
            onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
            fullWidth
            autoFocus
            autoComplete="current-password"
            disabled={deleteLoading}
            onKeyDown={(e) => { if (e.key === "Enter") handleDeleteAccount(); }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteStep(1)}
            disabled={deleteLoading}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteAccount}
            disabled={deleteLoading || !deletePassword}
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#EF4444", "&:hover": { bgcolor: "#DC2626" } }}
          >
            {deleteLoading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Delete my account"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Re-auth dialog for email change */}
      <Dialog open={reauthOpen} onClose={() => { if (!reauthLoading) { setReauthOpen(false); setReauthPassword(""); setReauthError(""); setPendingEmailSave(null); setBizEmail(originalBizEmail); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#083a6b" }}>
          Confirm your password
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your current password to confirm. We&apos;ll send a verification link to <strong>{pendingEmailSave}</strong> — your login email updates once you click it.
          </Typography>
          {reauthError && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{reauthError}</Alert>}
          <TextField
            label="Current password"
            type="password"
            value={reauthPassword}
            onChange={(e) => { setReauthPassword(e.target.value); setReauthError(""); }}
            fullWidth
            autoFocus
            autoComplete="current-password"
            onKeyDown={(e) => { if (e.key === "Enter") handleReauthAndUpdateEmail(); }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => { setReauthOpen(false); setReauthPassword(""); setReauthError(""); }} disabled={reauthLoading} sx={{ textTransform: "none", color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReauthAndUpdateEmail}
            disabled={reauthLoading}
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}
          >
            {reauthLoading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Send verification link"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={null}
        onClose={(_, reason) => { if (reason !== "clickaway") setSnackbar((s) => ({ ...s, open: false })); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
