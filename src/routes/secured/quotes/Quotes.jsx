import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faClock,
  faPaperPlane,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteField, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../../../../firebase";
import { useAddressAutocomplete } from "../../../hooks/useAddressAutocomplete";
import { isEmailClaimedByAnotherUser } from "../../../utils/userEmailAvailability";
import { FREE_QUOTE_LIMIT } from "../../../constants/plan";
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../../../constants/site";
import {
  AWAITING_STATUS_CHIP_SX,
  AWAITING_STATUS_METRIC_BG,
  AWAITING_STATUS_METRIC_ICON_COLOR,
} from "../../../constants/quoteUi";
import SubscribeDialog from "../../../components/SubscribeDialog";
import { formatUkPhoneNumber } from "../../../helpers/utility";
import {
  BUSINESS_LOGO_MAX_MB,
  deleteBusinessLogo,
  uploadBusinessLogo,
  validateBusinessLogoFile,
} from "../../../utils/businessLogo";

const STATUS_CONFIG = {
  accepted: { label: "Accepted", color: "#22C55E", icon: faCheckCircle, chipColor: "success" },
  pending: { label: "Pending", color: AWAITING_STATUS_METRIC_ICON_COLOR, icon: faClock, chipSx: AWAITING_STATUS_CHIP_SX },
  declined: { label: "Declined", color: "#EF4444", icon: faTimesCircle, chipColor: "error" },
};

/** Allowed post-onboarding redirects from registration flow (no open redirect). */
const ALLOWED_REDIRECT_AFTER_PROFILE = new Set(["/secured/billing", "/secured/profile", "/secured/settings"]);

const sanitizeProfileRedirect = (path) => {
  if (typeof path !== "string" || !ALLOWED_REDIRECT_AFTER_PROFILE.has(path)) return null;
  return path === "/secured/settings" ? "/secured/profile" : path;
};

const Quotes = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isDesktopNav = useMediaQuery("(min-width:769px)");
  const isWideMetrics = useMediaQuery("(min-width:922px)");
  const navigate = useNavigate();
  const location = useLocation();
  /** Fresh each render - read inside onAuthStateChanged without resubscribing. */
  const redirectAfterProfileRef = useRef(null);
  redirectAfterProfileRef.current = sanitizeProfileRedirect(location.state?.redirectAfterProfile);
  const consumedBillingRedirectRef = useRef(false);

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("free");
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  /** `null` = show all; otherwise filter by quote status */
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 7;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const {
    options: addressOptions,
    loading: addressLoading,
    resolving: addressResolving,
    scheduleSearch: scheduleAddressSearch,
    clearOptions: clearAddressOptions,
    finalizeSelection: finalizeAddressSelection,
  } = useAddressAutocomplete();

  // Onboarding profile state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingUid, setOnboardingUid] = useState(null);
  const [bizName, setBizName] = useState("");
  const [bizEmail, setBizEmail] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizLogoUrl, setBizLogoUrl] = useState("");
  const [bizLogoPath, setBizLogoPath] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef(null);
  const [onboardingAddressFocused, setOnboardingAddressFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let unsubByUid = null;
    let unsubByAuthEmail = null;
    let unsubByProfileEmail = null;

    // Each subscription owns its own Map so that when a snapshot fires with
    // fewer documents (e.g. after a deletion), the callback can replace its
    // slice entirely rather than only adding.  Accumulate-only maps never
    // remove stale entries, causing deleted quotes to persist until reload.
    const byUid = new Map();
    const byAuthEmail = new Map();
    const byProfileEmail = new Map();

    const merge = () => {
      const combined = new Map([...byAuthEmail, ...byProfileEmail, ...byUid]);
      const sorted = [...combined.values()]
        .filter((q) => !q.deleted)
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
      setQuotes(sorted);
      setLoading(false);
    };

    const subscribeByEmail = (email, label, targetMap) => {
      if (!email) return null;
      const q = query(collection(db, "quotes"), where("businessEmail", "==", email));
      return onSnapshot(
        q,
        (snap) => {
          targetMap.clear();
          snap.docs.forEach((d) => targetMap.set(d.id, { id: d.id, ...d.data() }));
          merge();
        },
        (e) => console.error(`Quotes by ${label} error`, e),
      );
    };

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }

      // Tear down ALL previous subscriptions and clear every map so that a
      // second onAuthStateChanged fire (cache → network) never leaves stale
      // listeners running or deleted-doc entries lingering in the maps.
      unsubByUid?.();
      unsubByAuthEmail?.();
      unsubByProfileEmail?.();
      unsubByUid = null;
      unsubByAuthEmail = null;
      unsubByProfileEmail = null;
      byUid.clear();
      byAuthEmail.clear();
      byProfileEmail.clear();

      // Check if business profile is set up.  Wrap in try/catch so a Firestore
      // permission error during an email-change transition never triggers the
      // onboarding dialog with blank fields.
      let profileData = null;
      try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        profileData = profileSnap.exists() ? profileSnap.data() : null;
        setPlan(profileData?.plan ?? "free");
      } catch (e) {
        console.error("Profile read failed (skipping onboarding check)", e);
      }

      // Commit pendingEmailChange if the user already clicked the verification
      // link (fallback in case Layout.jsx's commit didn't run).
      if (profileData?.pendingEmailChange?.toLowerCase() === user.email?.toLowerCase()) {
        setDoc(doc(db, "users", user.uid), {
          businessEmail: user.email,
          loginEmail: user.email,
          pendingEmailChange: deleteField(),
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch((e) => console.error("Quotes email commit failed", e));
      }

      if (profileData && !profileData.profileComplete) {
        // Profile doc exists but setup was never completed - pre-fill all fields
        // from whatever is already stored so the user doesn't lose data.
        setOnboardingUid(user.uid);
        setBizName(profileData.businessName ?? "");
        setBizEmail(profileData.businessEmail ?? user.email ?? "");
        setBizPhone(profileData.businessPhone ? formatUkPhoneNumber(profileData.businessPhone) : "");
        setBizAddress(profileData.businessAddress ?? "");
        setBizLogoUrl(profileData.businessLogoUrl ?? "");
        setBizLogoPath(profileData.businessLogoPath ?? "");
        setLogoFile(null);
        setLogoPreview("");
        setLogoRemoved(false);
        setLogoError("");
        setShowOnboarding(true);
      } else if (
        profileData?.profileComplete &&
        redirectAfterProfileRef.current &&
        !consumedBillingRedirectRef.current
      ) {
        consumedBillingRedirectRef.current = true;
        navigate(redirectAfterProfileRef.current, { replace: true });
        return;
      }
      // If profileData is null (read failed or doc missing), skip onboarding -
      // the profile likely exists but is temporarily unreadable (e.g. mid email
      // change).  The user can access Profile directly to fix their profile.

      // Primary: quotes owned by this UID (covers all quotes regardless of email).
      unsubByUid = onSnapshot(
        query(collection(db, "quotes"), where("userId", "==", user.uid)),
        (snap) => {
          byUid.clear();
          snap.docs.forEach((d) => byUid.set(d.id, { id: d.id, ...d.data() }));
          merge();
        },
        (e) => console.error("Quotes by userId error", e),
      );

      // Supplementary: quotes created under the current Auth email.
      if (user.email) {
        unsubByAuthEmail = subscribeByEmail(user.email, "authEmail", byAuthEmail);
      }

      // Also query by the Firestore-stored businessEmail in case it differs from
      // the Auth email (e.g. during / after an email change transition).
      const storedEmail = profileData?.businessEmail?.toLowerCase();
      if (storedEmail && storedEmail !== user.email?.toLowerCase()) {
        unsubByProfileEmail = subscribeByEmail(storedEmail, "profileEmail", byProfileEmail);
      }
    });

    return () => {
      unsubAuth();
      unsubByUid?.();
      unsubByAuthEmail?.();
      unsubByProfileEmail?.();
    };
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!bizName.trim()) { setSaveError("Business name is required."); return; }
    if (!bizEmail.trim()) { setSaveError("Email address is required."); return; }
    const normalized = bizEmail.trim().toLowerCase();
    setSaving(true);
    setSaveError("");
    setLogoError("");
    try {
      const claimed = await isEmailClaimedByAnotherUser(auth, db, normalized, onboardingUid);
      if (claimed) {
        setSaveError("This email is already associated with another account.");
        setSaving(false);
        return;
      }

      let nextLogoUrl = logoRemoved ? "" : bizLogoUrl;
      let nextLogoPath = logoRemoved ? "" : bizLogoPath;

      if (logoRemoved && bizLogoPath) {
        await deleteBusinessLogo(bizLogoPath);
      }

      if (logoFile) {
        if (bizLogoPath && !logoRemoved) {
          await deleteBusinessLogo(bizLogoPath).catch(() => {});
        }
        const uploaded = await uploadBusinessLogo(onboardingUid, logoFile);
        nextLogoUrl = uploaded.businessLogoUrl;
        nextLogoPath = uploaded.businessLogoPath;
      }

      await setDoc(doc(db, "users", onboardingUid), {
        businessName: bizName.trim(),
        businessEmail: normalized,
        businessPhone: bizPhone.trim(),
        businessAddress: bizAddress.trim(),
        businessLogoUrl: nextLogoUrl,
        businessLogoPath: nextLogoPath,
        profileComplete: true,
        loginEmail: auth.currentUser?.email?.toLowerCase() ?? normalized,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setShowOnboarding(false);
      const billingRedirect = sanitizeProfileRedirect(location.state?.redirectAfterProfile);
      if (billingRedirect) {
        navigate(billingRedirect, { replace: true, state: { scrollToPremium: true } });
        return;
      }
    } catch (e) {
      console.error("Profile save failed", e);
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openQuoteCount = quotes.length;
  const isPremium = plan === "premium";
  const isQuotaExhausted = !isPremium && openQuoteCount >= FREE_QUOTE_LIMIT;

  const handleCreateQuote = () => {
    if (isQuotaExhausted) {
      setSubscribeOpen(true);
    } else {
      navigate("/secured/quote", { state: { from: "quotes" } });
    }
  };

  const total = quotes.length;
  const accepted = quotes.filter((q) => q.status === "accepted").length;
  const pending = quotes.filter((q) => q.status === "pending").length;
  const declined = quotes.filter((q) => q.status === "declined").length;

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredQuotes = quotes.filter((q) => {
    const matchesStatus = !statusFilter || q.status === statusFilter;
    const matchesSearch = !normalizedSearch ||
      (q.customerName ?? "").toLowerCase().includes(normalizedSearch) ||
      (q.email ?? q.customerEmail ?? "").toLowerCase().includes(normalizedSearch) ||
      `qu-${q.quoteNumber ?? ""}`.includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });

  const displayedQuotes = filteredQuotes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredQuotes.length;

  const handleMetricClick = (filterKey) => {
    setVisibleCount(PAGE_SIZE);
    if (filterKey === null) {
      setStatusFilter(null);
    } else {
      setStatusFilter((prev) => (prev === filterKey ? null : filterKey));
    }
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setVisibleCount(PAGE_SIZE);
  };

  const metrics = [
    { title: "Total", value: total, icon: faPaperPlane, color: "#083a6b", bg: "#F0F4F8", filterKey: null },
    { title: "Accepted", value: accepted, icon: faCheckCircle, color: "#22C55E", bg: "#ECFDF5", filterKey: "accepted" },
    { title: "Pending", value: pending, icon: faClock, color: AWAITING_STATUS_METRIC_ICON_COLOR, bg: AWAITING_STATUS_METRIC_BG, filterKey: "pending" },
    { title: "Declined", value: declined, icon: faTimesCircle, color: "#EF4444", bg: "#FEF2F2", filterKey: "declined" },
  ];

  const formatDate = (quote) => {
    const ts = quote.createdAt?.toDate?.() ?? (quote.quoteDate ? new Date(`${quote.quoteDate}T12:00:00`) : null);
    if (!ts) return "-";
    return ts.toLocaleDateString(isXs ? "en-GB" : "en-US", isXs
      ? { day: "2-digit", month: "2-digit", year: "2-digit" }
      : { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: APP_PAGE_CONTENT_MAX_WIDTH,
        mx: "auto",
        boxSizing: "border-box",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        // Layout secured main: padding top ~86px + bottom ~80px — match visible content height
        minHeight: "calc(100dvh - 166px)",
      }}
    >
      {/* ── Onboarding modal ── */}
      <Dialog open={showOnboarding} fullWidth maxWidth="sm" disableEscapeKeyDown>
        <DialogTitle sx={{ fontWeight: 700, color: "#083a6b", pb: 0 }}>
          Finish setting up your account
        </DialogTitle>
        <DialogContent sx={{ pt: "16px !important", display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Add your business details once and we&apos;ll pre-fill them on every quote you create.
          </Typography>

          {saveError && <Alert severity="error" sx={{ py: 0, alignItems: "center" }}>{saveError}</Alert>}

          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#083a6b" sx={{ mb: 0.5 }}>
              Business logo
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Optional. Shown on quote and invoice PDFs. PNG, JPG or WebP, max {BUSINESS_LOGO_MAX_MB} MB.
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              {(logoPreview || (!logoRemoved && bizLogoUrl)) ? (
                <Box
                  component="img"
                  src={logoPreview || bizLogoUrl}
                  alt="Logo preview"
                  sx={{
                    height: 64,
                    maxWidth: 160,
                    objectFit: "contain",
                    border: "1px solid #E5E7EB",
                    borderRadius: 1.5,
                    bgcolor: "#fff",
                    p: 1,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 1.5,
                    border: "1px dashed #CBD5E1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94A3B8",
                    bgcolor: "#F8FAFC",
                  }}
                >
                  <ImageOutlinedIcon fontSize="small" />
                </Box>
              )}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  startIcon={<ImageOutlinedIcon />}
                  disabled={saving}
                  sx={{ textTransform: "none" }}
                >
                  {bizLogoUrl || logoPreview ? "Change logo" : "Upload logo"}
                  <input
                    ref={logoInputRef}
                    hidden
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      const err = validateBusinessLogoFile(file);
                      if (err) {
                        setLogoError(err);
                        return;
                      }
                      setLogoError("");
                      setLogoRemoved(false);
                      setLogoFile(file);
                      setLogoPreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return URL.createObjectURL(file);
                      });
                    }}
                  />
                </Button>
                {(bizLogoUrl || logoPreview) && !logoRemoved ? (
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    startIcon={<DeleteOutlineIcon />}
                    disabled={saving}
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return "";
                      });
                      setLogoRemoved(true);
                      setLogoError("");
                      if (logoInputRef.current) logoInputRef.current.value = "";
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Remove
                  </Button>
                ) : null}
              </Box>
            </Box>
            {logoError ? (
              <Alert severity="error" sx={{ mt: 1, py: 0, alignItems: "center" }}>{logoError}</Alert>
            ) : null}
          </Box>

          <TextField
            label="Business name"
            value={bizName}
            onChange={(e) => { setBizName(e.target.value); setSaveError(""); }}
            fullWidth
            autoFocus
            required
          />
          <TextField
            label="Email address"
            type="email"
            value={bizEmail}
            onChange={(e) => { setBizEmail(e.target.value); setSaveError(""); }}
            fullWidth
            required
          />
          <TextField
            label="Phone number"
            type="tel"
            value={bizPhone}
            onChange={(e) => { setBizPhone(formatUkPhoneNumber(e.target.value)); setSaveError(""); }}
            fullWidth
            autoComplete="tel"
            slotProps={{ htmlInput: { inputMode: "tel" } }}
            helperText="Optional. Shown on quote and invoice PDFs."
          />
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
                  <Box sx={{ py: 0.75, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.25 }}>
                    <Typography variant="body2" fontWeight={600}>{option.primary}</Typography>
                    {option.subtitle ? (
                      <Typography variant="caption" color="text.secondary">{option.subtitle}</Typography>
                    ) : null}
                  </Box>
                </li>
              );
            }}
            renderInput={(params) => {
              const addrFilled = Boolean(bizAddress.trim());
              const shrink = onboardingAddressFocused || addrFilled;
              const {
                InputProps: paramsInputProps = {},
                InputLabelProps: paramsInputLabelProps,
                slotProps: paramsSlotProps,
                ...restParams
              } = params;
              return (
              <TextField
                {...restParams}
                label="Business address"
                multiline
                minRows={2}
                maxRows={3}
                fullWidth
                placeholder="e.g. 123 Main St, London, E1 1AA"
                slotProps={{
                  ...paramsSlotProps,
                  inputLabel: {
                    shrink,
                    ...paramsSlotProps?.inputLabel,
                    ...paramsInputLabelProps,
                  },
                }}
                InputProps={{
                  ...paramsInputProps,
                  onFocus: (e) => {
                    setOnboardingAddressFocused(true);
                    paramsInputProps.onFocus?.(e);
                  },
                  onBlur: (e) => {
                    setOnboardingAddressFocused(false);
                    paramsInputProps.onBlur?.(e);
                  },
                  endAdornment: (
                    <>
                      {addressLoading || addressResolving ? (
                        <CircularProgress color="inherit" size={20} sx={{ mr: 1 }} />
                      ) : null}
                      {paramsInputProps.endAdornment}
                    </>
                  ),
                }}
              />
              );
            }}
          />

          <Button
            variant="contained"
            size="large"
            onClick={handleSaveProfile}
            disabled={saving}
            sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}
          >
            {saving ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Save and continue"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isDesktopNav ? "row" : "column",
          justifyContent: "space-between",
          alignItems: isDesktopNav ? "flex-start" : "stretch",
          mb: 3,
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <FontAwesomeIcon icon={faPaperPlane} style={{ color: "#083a6b", fontSize: "1.25rem", flexShrink: 0 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#083a6b" }}>
              Quotes
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Create quotes, and manage sent quotes.
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          <TextField
            size="small"
            placeholder="Search by name, email or quote ID…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            sx={{ width: isDesktopNav ? 340 : "100%" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "#9CA3AF" }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleSearchChange("")}
                    edge="end"
                    aria-label="Clear search"
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
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateQuote}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "#083a6b",
              "&:hover": { bgcolor: "#062d52" },
              borderRadius: 2,
              px: 3,
              display: isDesktopNav ? "inline-flex" : "none",
              flexShrink: 0,
            }}
          >
            Create a quote
          </Button>
        </Box>
      </Box>

      {/* Metrics */}
      <Grid container spacing={2} sx={{ mb: 4, flexShrink: 0, width: "100%", minWidth: 0, boxSizing: "border-box" }}>
        {metrics.map((m, i) => {
          const selected =
            (m.filterKey === null && statusFilter === null) ||
            (m.filterKey !== null && statusFilter === m.filterKey);
          return (
            <Grid
              item
              xs={6}
              key={i}
              sx={isWideMetrics ? {
                flexGrow: 0,
                flexBasis: "25%",
                maxWidth: "25%",
              } : undefined}
            >
              <Card
                onClick={() => handleMetricClick(m.filterKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleMetricClick(m.filterKey);
                  }
                }}
                sx={{
                  backgroundColor: m.bg,
                  borderRadius: "14px",
                  boxShadow: selected
                    ? "0px 2px 8px rgba(0,0,0,0.04), 0 0 0 2px #083a6b"
                    : "0px 2px 8px rgba(0,0,0,0.04)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  cursor: "pointer",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: selected ? "0px 4px 14px rgba(0,0,0,0.08), 0 0 0 2px #083a6b" : "0px 4px 14px rgba(0,0,0,0.08)" },
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 }, p: { xs: 1.25, sm: 2 }, "&:last-child": { pb: { xs: 1.25, sm: 2 } }, overflow: "hidden" }}>
                  <Box sx={{
                    bgcolor: "#fff", borderRadius: "50%",
                    width: { xs: 32, sm: 48 }, height: { xs: 32, sm: 48 },
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0px 2px 6px rgba(0,0,0,0.05)", flexShrink: 0,
                  }}>
                    <FontAwesomeIcon icon={m.icon} style={{ fontSize: "14px", color: m.color }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
                      {m.title}
                    </Typography>
                    {loading ? (
                      <CircularProgress size={16} sx={{ mt: 0.5 }} />
                    ) : (
                      <Typography sx={{ fontWeight: 700, color: "#083a6b", lineHeight: 1.2, fontSize: { xs: "1.1rem", sm: "1.25rem" } }}>
                        {m.value}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Quotes table + load more — desktop: flex fill + table scroll only; mobile: page scroll */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
        }}
      >
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: { xs: 6, sm: 0 },
            flex: { sm: 1 },
            minHeight: { sm: 0 },
          }}
        >
          <CircularProgress />
        </Box>
      ) : quotes.length === 0 ? (
        <Box
          sx={{
            flex: { sm: 1 },
            minHeight: { sm: 0 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: { sm: "auto" },
          }}
        >
          <Paper elevation={0} sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: 6, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              You haven&apos;t sent any quotes yet.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use <Box component="span" sx={{ fontWeight: 700, color: "#083a6b" }}>Create a quote</Box> above to
              build your first one.
            </Typography>
          </Paper>
        </Box>
      ) : filteredQuotes.length === 0 ? (
        <Box
          sx={{
            flex: { sm: 1 },
            minHeight: { sm: 0 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: { sm: "auto" },
          }}
        >
          <Paper elevation={0} sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: 4, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {searchQuery
                ? `No quotes found for "${searchQuery}".`
                : `No ${STATUS_CONFIG[statusFilter]?.label?.toLowerCase() ?? statusFilter} quotes.`}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => { setStatusFilter(null); setSearchQuery(""); setVisibleCount(PAGE_SIZE); }}
              sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b" }}
            >
              Clear filters
            </Button>
          </Paper>
        </Box>
      ) : (
        <Box
          sx={{
            width: "100%",
            minHeight: 0,
            display: { sm: "grid" },
            gridTemplateRows: { sm: "auto auto" },
          }}
        >
          <Box
            sx={{
              width: "100%",
              minHeight: 0,
            }}
          >
      {isXs ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {displayedQuotes.map((quote) => {
            const cfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.pending;
            const total = quote.pricing?.total ?? 0;
            const currency = quote.currency ?? "GBP";
            const formatted = new Intl.NumberFormat(undefined, {
              style: "currency", currency, currencyDisplay: "narrowSymbol",
            }).format(total);

            return (
              <Paper
                key={quote.id}
                elevation={0}
                onClick={() => navigate(`/secured/quote/${quote.id}`)}
                sx={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 2,
                  p: 2,
                  cursor: "pointer",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.08)", borderColor: "#083a6b" },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {quote.customerName ?? "-"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6B7280" }}>
                      QU-{quote.quoteNumber ?? "-"} · {formatDate(quote)}
                    </Typography>
                  </Box>
                  <Chip
                    label={cfg.label}
                    {...(cfg.chipColor ? { color: cfg.chipColor } : {})}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: "11px", flexShrink: 0, ...cfg.chipSx }}
                  />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#083a6b" }}>
                  {formatted}
                </Typography>
              </Paper>
            );
          })}
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 2,
            border: "1px solid #E5E7EB",
            width: "100%",
            minHeight: 0,
            overflowX: "auto",
            overflowY: "visible",
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {[
                  { label: "Customer", align: "left" },
                  { label: "Quote ID", align: "left" },
                  { label: "Date", align: "left" },
                  { label: "Total", align: "right" },
                  { label: "Status", align: "left" },
                  { label: "", align: "right" },
                ].map((h) => (
                  <TableCell
                    key={h.label}
                    align={h.align}
                    sx={{
                      fontWeight: 700,
                      color: "#fff",
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      borderBottom: "2px solid #E5E7EB",
                      py: 1.5,
                      backgroundColor: "#083a6b",
                      "&.MuiTableCell-stickyHeader": {
                        backgroundColor: "#083a6b",
                      },
                    }}
               
                  >
                    {h.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedQuotes.map((quote) => {
                const cfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.pending;
                const total = quote.pricing?.total ?? 0;
                const currency = quote.currency ?? "GBP";
                const formatted = new Intl.NumberFormat(undefined, {
                  style: "currency", currency, currencyDisplay: "narrowSymbol",
                }).format(total);

                return (
                  <TableRow
                    key={quote.id}
                    onClick={() => navigate(`/secured/quote/${quote.id}`)}
                    sx={{
                      cursor: "pointer",
                      bgcolor: "#fff",
                      transition: "background 0.15s",
                      "&:last-child td": { borderBottom: 0 },
                      "&:hover": {
                        bgcolor: "#EFF6FF",
                        "& .row-chevron": { opacity: 1 },
                      },
                    }}
                  >
                    {/* Customer - primary column */}
                    <TableCell sx={{ maxWidth: 220, py: 1.75 }}>
                      <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {quote.customerName ?? "-"}
                      </Typography>
                      {quote.email || quote.customerEmail ? (
                        <Typography variant="caption" sx={{ color: "#9CA3AF", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {quote.email ?? quote.customerEmail}
                        </Typography>
                      ) : null}
                    </TableCell>

                    {/* Quote ID */}
                    <TableCell sx={{ fontSize: "13px", whiteSpace: "nowrap", color: "#083a6b", fontWeight: 700, py: 1.75 }}>
                      QU-{quote.quoteNumber ?? "-"}
                    </TableCell>

                    {/* Date */}
                    <TableCell sx={{ fontSize: "13px", whiteSpace: "nowrap", color: "#6B7280", py: 1.75 }}>
                      {formatDate(quote)}
                    </TableCell>

                    {/* Total - right-aligned */}
                    <TableCell align="right" sx={{ fontSize: "13px", whiteSpace: "nowrap", fontWeight: 700, color: "#111827", py: 1.75 }}>
                      {formatted}
                    </TableCell>

                    {/* Status */}
                    <TableCell sx={{ py: 1.75 }}>
                      <Chip
                        label={cfg.label}
                        {...(cfg.chipColor ? { color: cfg.chipColor } : {})}
                        size="small"
                        sx={{ fontWeight: 600, fontSize: "12px", ...cfg.chipSx }}
                      />
                    </TableCell>

                    {/* Chevron - visible on row hover */}
                    <TableCell sx={{ width: 40, p: 0, pr: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                        <ChevronRightIcon
                          className="row-chevron"
                          sx={{ opacity: 0, transition: "opacity 0.15s", fontSize: 22, color: "#083a6b" }}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
          </Box>
          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              pt: 2.5,
              mt: "auto",
            }}
          >
            {hasMore && (
              <Button
                variant="outlined"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", minWidth: 160 }}
              >
                Load more
              </Button>
            )}
            <Typography variant="caption" color="text.secondary">
              Showing {Math.min(visibleCount, filteredQuotes.length)} of {filteredQuotes.length} quote{filteredQuotes.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </Box>
      )}
      </Box>

      <SubscribeDialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        quotaExhausted
      />
    </Box>
  );
};

export default Quotes;
