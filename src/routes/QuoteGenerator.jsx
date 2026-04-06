import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import UpArrowIcon from "@mui/icons-material/ArrowUpward";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines, faPaperPlane, faShare, faDownload } from "@fortawesome/free-solid-svg-icons";
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
  IconButton,
  ListSubheader,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableContainer,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import { collection, addDoc, doc, getDoc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import ReCAPTCHA from "react-google-recaptcha";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  useQuote,
  isoToday,
  newLineItemId,
  createDefaultLineItems,
} from "../context/QuoteContext";
import {
  CURRENCY_OPTIONS,
  POPULAR_CURRENCY_OPTIONS,
  getDefaultCurrency,
  getDefaultVatPercent,
  getFlagEmoji,
} from "../helpers/currency";
import { getAddressSearchCountryHint } from "../helpers/addressSearch";
import { useAddressAutocomplete } from "../hooks/useAddressAutocomplete";
import { AiPromptField } from "../components/AiPromptField";
import { QuoteLineItemRow } from "../components/QuoteLineItemRow";
import { buildQuotePdfDocument, getQuotePdfFilename } from "../utils/buildQuotePdfDocument";
import { lineNet, lineVatAmount } from "../utils/quoteLineCalculations";
import { parseQuoteLinesWithAi } from "../api/parseQuoteLines";
import {
  sendQuoteVerificationCode,
  verifyQuoteVerificationCode,
} from "../api/quoteVerification";
import { mapParsedLinesToQuoteItems } from "../helpers/mapParsedLinesToQuoteItems";
import { capitaliseWords } from "../helpers/utility";

const formatDateLong = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const currencyMenuRow = (opt) => (
  <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "1.0625rem" }}>
    <Box
      aria-hidden
      sx={{
        fontSize: "1.25rem",
        lineHeight: 1,
        width: "1.35rem",
        display: "flex",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {opt.region ? getFlagEmoji(opt.region) : ""}
    </Box>
    <span>{opt.label}</span>
  </Box>
);

/** Slightly stronger business name in outlined fields */
const docTitleOutlinedSx = {
  "& .MuiInputBase-input": {
    fontSize: { xs: "1.125rem", sm: "1.25rem" },
    fontWeight: 700,
  },
};

/** Larger inputs and labels on the quote form (readability / touch). */
const quoteFormFieldDensitySx = {
  "& .MuiOutlinedInput-root": { fontSize: "1.0625rem" },
  "& .MuiInputLabel-root": {
    fontSize: "1rem",
    "&.MuiInputLabel-shrink": { fontSize: "0.9375rem" },
  },
  "& .MuiFormHelperText-root": { fontSize: "0.9375rem" },
};

/** Below this width the line-items table would overflow; use card layout instead. */
const LINE_ITEMS_TABLE_MIN_PX = 700;
const RESEND_COOLDOWN_MS = 60 * 1000;

const QuoteGenerator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { quoteData, updateQuoteData, resetQuoteData } = useQuote();
  const [formErrors, setFormErrors] = useState({});
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [usageChecking, setUsageChecking] = useState(false);
  const [sendingVerificationCode, setSendingVerificationCode] = useState(false);
  const [exportPdfDialogOpen, setExportPdfDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyDialogLoading, setVerifyDialogLoading] = useState(false);
  const [verifyDialogError, setVerifyDialogError] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyChallengeId, setVerifyChallengeId] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendAvailableAtMs, setResendAvailableAtMs] = useState(0);
  const [resendNowMs, setResendNowMs] = useState(Date.now());
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistEmailError, setWaitlistEmailError] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistFailCount, setWaitlistFailCount] = useState(0);
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const {
    options: addressOptions,
    loading: addressLoading,
    resolving: addressResolving,
    scheduleSearch: scheduleAddressSearch,
    clearOptions: clearAddressOptions,
    finalizeSelection: finalizeAddressSelection,
  } = useAddressAutocomplete();

  const appliedLandingTextRef = useRef(false);
  const lineItemsLayoutRef = useRef(null);
  const nlLineChatInputRef = useRef(null);
  const [flashedRowIds, setFlashedRowIds] = useState(new Set());
  const flashedRowIdsRef = useRef(new Set());
  const [lineItemsUseCards, setLineItemsUseCards] = useState(false);
  const [aiParseLoading, setAiParseLoading] = useState(false);
  const [aiParseError, setAiParseError] = useState(null);
  const [aiQuotaExhausted, setAiQuotaExhausted] = useState(false);
  const [nlLineChatInput, setNlLineChatInput] = useState("");
  const [nlChatFieldError, setNlChatFieldError] = useState(false);
  const [showAiLineSection, setShowAiLineSection] = useState(false);

  // The form is considered dirty when the user has entered any meaningful data.
  const isFormDirty = !!(
    quoteData.businessName?.trim() ||
    quoteData.businessEmail?.trim() ||
    quoteData.customerName?.trim() ||
    quoteData.email?.trim() ||
    quoteData.businessAddress?.trim() ||
    (Array.isArray(quoteData.lineItems) &&
      quoteData.lineItems.some((item) => item.description?.trim() || item.unitPrice > 0))
  );

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const resendSecondsLeft = Math.max(
    0,
    Math.ceil((resendAvailableAtMs - resendNowMs) / 1000),
  );
  const resendBlocked = resendSecondsLeft > 0;

  useEffect(() => {
    if (!verifyDialogOpen || !resendBlocked) return undefined;
    const timer = setInterval(() => setResendNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [verifyDialogOpen, resendBlocked]);

  // Block browser tab close / hard refresh when the form is dirty.
  useEffect(() => {
    if (!isFormDirty) return undefined;
    const handle = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [isFormDirty]);

  const handleHomeClick = (e) => {
    if (isFormDirty) {
      e.preventDefault();
      setLeaveDialogOpen(true);
    }
  };

  const handleConfirmLeave = () => {
    resetQuoteData();
    setLeaveDialogOpen(false);
    navigate("/");
  };

  const handleCancelLeave = () => {
    setLeaveDialogOpen(false);
  };

  useEffect(() => {
    const incoming = location.state?.projectDescription?.trim();
    if (incoming && !appliedLandingTextRef.current) {
      appliedLandingTextRef.current = true;
      setShowAiLineSection(true);
      // Parse the landing-page text with AI and replace the default empty row.
      runAiParseRef.current(incoming, { replace: true });
    }
    // runAiParseRef is a ref – intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    updateQuoteData({ quoteDate: isoToday() });
    // Refresh to today's date whenever the quote page is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!Array.isArray(quoteData.lineItems) || quoteData.lineItems.length === 0) {
      updateQuoteData({ lineItems: createDefaultLineItems() });
      return;
    }
    const needsMigrate = quoteData.lineItems.some(
      (r) => Object.prototype.hasOwnProperty.call(r, "label") && r.unitPrice === undefined,
    );
    if (needsMigrate) {
      updateQuoteData({
        lineItems: quoteData.lineItems.map((r) => {
          if (r.unitPrice !== undefined) return r;
          return {
            id: r.id,
            description: r.label ?? "",
            unitPrice: Number(r.amount) || 0,
            quantity: 1,
            vatPercent: getDefaultVatPercent(),
          };
        }),
      });
    }
  }, [quoteData.lineItems, updateQuoteData]);

  const lineItems =
    Array.isArray(quoteData.lineItems) && quoteData.lineItems.length > 0
      ? quoteData.lineItems
      : createDefaultLineItems();

  useLayoutEffect(() => {
    const el = lineItemsLayoutRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      setLineItemsUseCards(w < LINE_ITEMS_TABLE_MIN_PX);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pricing = useMemo(() => {
    let netSubtotal = 0;
    let vatTotal = 0;
    for (const row of lineItems) {
      netSubtotal += lineNet(row);
      vatTotal += lineVatAmount(row);
    }
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const tax = round2(vatTotal);
    const subtotal = round2(netSubtotal);
    return { subtotal, tax, total: round2(subtotal + tax) };
  }, [lineItems]);

  const allowedCurrencyCodes = useMemo(
    () => new Set(CURRENCY_OPTIONS.map((o) => o.code)),
    [],
  );
  const resolvedCurrency = quoteData.currency || getDefaultCurrency();
  const activeCurrency = allowedCurrencyCodes.has(resolvedCurrency)
    ? resolvedCurrency
    : "GBP";

  useEffect(() => {
    if (quoteData.currency && !allowedCurrencyCodes.has(quoteData.currency)) {
      updateQuoteData({ currency: "GBP" });
    }
  }, [quoteData.currency, allowedCurrencyCodes, updateQuoteData]);

  /** Currency symbol only (e.g. $), not region prefix or ISO code (e.g. US$, USD). */
  const formatMoney = (amount) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: activeCurrency,
      currencyDisplay: "narrowSymbol",
    }).format(amount);

  const handleInputChange = (field) => (event) => {
    updateQuoteData({ [field]: event.target.value });
  };

  const updateLineField = (id, field) => (event) => {
    const raw = event.target.value;
    if (field === "description") {
      updateQuoteData({
        lineItems: lineItems.map((row) =>
          row.id === id ? { ...row, description: raw } : row,
        ),
      });
      if (raw.trim() && formErrors.lineItems) {
        setFormErrors((prev) => { const n = { ...prev }; delete n.lineItems; return n; });
      }
      return;
    }
    if (field === "quantity") {
      const n = raw === "" ? 0 : Number.parseFloat(raw);
      const val = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
      updateQuoteData({
        lineItems: lineItems.map((row) =>
          row.id === id ? { ...row, quantity: val } : row,
        ),
      });
      return;
    }
    const n = raw === "" ? 0 : Number.parseFloat(raw);
    const val = Number.isFinite(n) ? n : 0;
    updateQuoteData({
      lineItems: lineItems.map((row) =>
        row.id === id ? { ...row, [field]: val } : row,
      ),
    });
  };

  const addLineItem = () => {
    updateQuoteData({
      lineItems: [
        ...lineItems,
        {
          id: newLineItemId(),
          description: "",
          unitPrice: 0,
          quantity: 1,
          vatPercent: getDefaultVatPercent(),
        },
      ],
    });
  };

  const removeLineItem = (id) => {
    if (lineItems.length <= 1) return;
    updateQuoteData({ lineItems: lineItems.filter((row) => row.id !== id) });
  };

  // Core AI parse – call with any text directly; replace=true overwrites line items.
  const runAiParse = useCallback(
    async (text, { replace = false } = {}) => {
      setAiParseLoading(true);
      try {
        const data = await parseQuoteLinesWithAi(text);
        let rows = mapParsedLinesToQuoteItems(data.lines);
        if (!rows.length) {
          // AI couldn't extract anything — fall back to adding the raw text as a plain item.
          rows = [{ id: newLineItemId(), description: text.trim(), unitPrice: 0, quantity: 1, vatPercent: getDefaultVatPercent() }];
        }
        updateQuoteData({ lineItems: replace ? rows : [...lineItems, ...rows] });
        setNlLineChatInput("");

        const newIds = new Set(rows.map((r) => r.id));
        flashedRowIdsRef.current = newIds;
        setFlashedRowIds(new Set(newIds));
        requestAnimationFrame(() => {
          const firstNewId = rows[0]?.id;
          if (firstNewId) {
            const el = document.getElementById(`quote-row-${firstNewId}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          setTimeout(() => {
            flashedRowIdsRef.current = new Set();
            setFlashedRowIds(new Set());
          }, 1800);
        });
      } catch (e) {
        const code = e?.code ?? "";
        if (code === "functions/resource-exhausted") {
          setAiQuotaExhausted(true);
          setShowAiLineSection(false);
          return;
        }
        const message =
          e?.message ||
          (typeof code === "string" ? code : "") ||
          "Could not parse line items.";
        setAiParseError(String(message));
      } finally {
        setAiParseLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lineItems, updateQuoteData],
  );

  // Keep a stable ref so the mount effect can call the latest version
  // without needing it as a dependency (avoids re-triggering on every render).
  const runAiParseRef = useRef(runAiParse);
  useEffect(() => { runAiParseRef.current = runAiParse; });

  const handleNlChatAddLines = async () => {
    const text = nlLineChatInput.trim();
    if (!text) {
      setNlChatFieldError(true);
      setAiParseError(
        "Type one or more lines in plain English (e.g. £120 Garden landscaping)"
      );
      requestAnimationFrame(() => nlLineChatInputRef.current?.focus());
      return;
    }
    setNlChatFieldError(false);
    setAiParseError(null);
    await runAiParse(text);
  };

  const validateWaitlistEmail = (value) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(value).toLowerCase());
  };

  const formatSentAtLabel = () =>
    new Date()
      .toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      .replace(/(\d{1,2})/, (d) => {
        const n = Number(d);
        if (n > 3 && n < 21) return `${n}th`;
        switch (n % 10) {
          case 1:
            return `${n}st`;
          case 2:
            return `${n}nd`;
          case 3:
            return `${n}rd`;
          default:
            return `${n}th`;
        }
      });

  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateQuoteForm = () => {
    const errors = {};
    if (!quoteData.businessName?.trim()) errors.businessName = true;
    const bizEmail = quoteData.businessEmail?.trim() ?? "";
    if (!bizEmail) errors.businessEmail = "required";
    else if (!EMAIL_RE.test(bizEmail)) errors.businessEmail = "invalid";
    if (!quoteData.customerName?.trim()) errors.customerName = true;
    const custEmail = quoteData.email?.trim() ?? "";
    if (custEmail && !EMAIL_RE.test(custEmail)) errors.email = "invalid";
    if (!lineItems.some((item) => item.description?.trim())) errors.lineItems = true;
    setFormErrors(errors);
    return errors;
  };

  const FREE_USES = 3;
  const USAGE_RESET_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  const closeVerifyDialog = () => {
    setVerifyDialogOpen(false);
    setVerifyDialogLoading(false);
    setVerifyDialogError("");
    setVerifyCode("");
    setVerifyChallengeId("");
    setVerificationEmail("");
    setResendAvailableAtMs(0);
    setResendNowMs(Date.now());
  };

  const allowExportAfterChecks = () => {
    if (isMobile()) {
      handleOpenExportPdfDialog();
    } else {
      handleExportPdf();
    }
  };

  // Final usage consume step after successful email PIN verification.
  const consumeUsageAndAllowSend = async (email) => {
    setUsageChecking(true);

    try {
      const ref = doc(db, "quote_usage", email);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, { count: 1, since: serverTimestamp() });
        allowExportAfterChecks();
        return;
      }

      const data = snap.data();
      const sinceMs = data.since?.toMillis?.() ?? Date.now();
      const withinWindow = Date.now() - sinceMs < USAGE_RESET_MS;

      if (!withinWindow) {
        await setDoc(ref, { count: 1, since: serverTimestamp() });
        allowExportAfterChecks();
        return;
      }

      if (data.count < FREE_USES) {
        await setDoc(ref, { count: increment(1) }, { merge: true });
        allowExportAfterChecks();
        return;
      }

      // Limit reached — show waitlist.
      setWaitlistEmail(email);
      setWaitlistEmailError(false);
      setWaitlistOpen(true);
    } catch (e) {
      console.error("Usage check failed", e);
      allowExportAfterChecks();
    } finally {
      setUsageChecking(false);
    }
  };
  

  const openVerifyDialogWithFreshCode = async (email) => {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    // Keep email available even if request fails, so "Resend code" can still work.
    setVerificationEmail(normalizedEmail);
    setSendingVerificationCode(true);
    setVerifyDialogError("");
    try {
      const data = await sendQuoteVerificationCode(normalizedEmail);
      setVerifyChallengeId(String(data?.challengeId ?? ""));
      setVerifyCode("");
      setResendAvailableAtMs(Date.now() + RESEND_COOLDOWN_MS);
      setResendNowMs(Date.now());
      setVerifyDialogOpen(true);
    } catch (e) {
      console.error("Verification code send failed", e);
      const code = String(e?.code || "");
      if (code === "functions/resource-exhausted") {
        // Keep UX aligned with backend cooldown policy.
        setResendAvailableAtMs((prev) => Math.max(prev, Date.now() + RESEND_COOLDOWN_MS));
        setResendNowMs(Date.now());
      }
      setVerifyDialogError(e?.message || "Could not send verification code. Please try again.");
      setVerifyDialogOpen(true);
    } finally {
      setSendingVerificationCode(false);
    }
  };

  const handleOpenWaitlist = async () => {
    const errors = validateQuoteForm();
    if (Object.keys(errors).length > 0) {
      const firstId = errors.businessName
        ? "field-businessName"
        : errors.businessEmail
          ? "field-businessEmail"
          : errors.customerName
            ? "field-customerName"
            : errors.email
              ? "field-email"
              : "field-lineItems";
      requestAnimationFrame(() => {
        const el = document.getElementById(firstId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.querySelector?.("input, textarea")?.focus();
      });
      return;
    }

    const email = (quoteData.businessEmail ?? "").trim().toLowerCase();
    setUsageChecking(true);
    try {
      // Usage gate must run before verification so users over limit
      // are sent straight to the waitlist (original behavior).
      const ref = doc(db, "quote_usage", email);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const sinceMs = data.since?.toMillis?.() ?? Date.now();
        const withinWindow = Date.now() - sinceMs < USAGE_RESET_MS;
        if (withinWindow && data.count >= FREE_USES) {
          setWaitlistEmail(email);
          setWaitlistEmailError(false);
          setWaitlistOpen(true);
          return;
        }
        // Returning sender (usage doc exists): skip OTP and continue.
        await consumeUsageAndAllowSend(email);
        return;
      }
      await openVerifyDialogWithFreshCode(email);
    } catch (e) {
      console.error("Usage pre-check failed", e);
      await openVerifyDialogWithFreshCode(email);
    } finally {
      setUsageChecking(false);
    }
  };

  const handleResendVerificationCode = async () => {
    const fallbackEmail = String(quoteData.businessEmail ?? "").trim().toLowerCase();
    const targetEmail = verificationEmail || fallbackEmail;
    if (!targetEmail) return;
    await openVerifyDialogWithFreshCode(targetEmail);
  };

  const handleConfirmVerification = async () => {
    const code = verifyCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setVerifyDialogError("missing_code");
      return;
    }
    if (!verifyChallengeId || !verificationEmail) {
      setVerifyDialogError("Verification session expired. Please resend the code.");
      return;
    }

    setVerifyDialogLoading(true);
    setVerifyDialogError("");
    try {
      await verifyQuoteVerificationCode({
        challengeId: verifyChallengeId,
        email: verificationEmail,
        code,
      });
      closeVerifyDialog();
      await consumeUsageAndAllowSend(verificationEmail);
    } catch (e) {
      console.error("Verification code check failed", e);
      setVerifyDialogError(
        e?.message || "Verification failed. Please check the code and try again.",
      );
    } finally {
      setVerifyDialogLoading(false);
    }
  };

  const handleCloseWaitlist = () => {
    setWaitlistOpen(false);
    setWaitlistEmail("");
    setWaitlistEmailError(false);
    setWaitlistSuccess(false);
    setWaitlistSubmitting(false);
    setRecaptchaVerified(false);
    setShowRecaptcha(false);
    setWaitlistFailCount(0);
  };

  const handleWaitlistSubmit = async () => {
    if (!validateWaitlistEmail(waitlistEmail)) {
      setWaitlistEmailError(true);
      setWaitlistFailCount((c) => {
        const next = c + 1;
        if (next >= 2) setShowRecaptcha(true);
        return next;
      });
      const el = document.getElementById("quoteGeneratorWaitlistEmail");
      if (el) el.focus();
      return;
    }
    if (showRecaptcha && !recaptchaVerified) {
      alert("Please complete the reCAPTCHA verification.");
      return;
    }

    setWaitlistSubmitting(true);
    try {
      await addDoc(collection(db, "emails"), {
        email: waitlistEmail.trim(),
        sentAt: formatSentAtLabel(),
        source: "quote-generator",
      });
      setWaitlistSuccess(true);
    } catch (error) {
      console.error("Error adding email to Firestore:", error);
      alert("Something went wrong. Please try again later.");
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  const handleOpenExportPdfDialog = () => setExportPdfDialogOpen(true);
  const handleCloseExportPdfDialog = () => setExportPdfDialogOpen(false);

  const isMobile = () =>
    typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

  const handleExportPdf = async () => {
    const filename = getQuotePdfFilename(quoteData);
    const doc = buildQuotePdfDocument({
      quoteData,
      lineItems,
      pricing,
      formatMoney,
      formatDateLong,
    });

    // Web Share API with file support — mobile only.
    if (isMobile()) {
      try {
        const blob = doc.output("blob");
        const file = new File([blob], filename, { type: "application/pdf" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          setExportPdfDialogOpen(false);
          return;
        }
      } catch (e) {
        if (e?.name === "AbortError") return; // user cancelled
        console.warn("Web Share failed, falling back to download", e);
      }
    }

    // Desktop or unsupported mobile — direct download.
    doc.save(filename);
    setExportPdfDialogOpen(false);
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1024px",
        minWidth: 0,
        mx: "auto",
        boxSizing: "border-box",
        px: { xs: 1.5, sm: 2 },
        py: { xs: 2, md: 4 },
        animation: "fadeIn 300ms ease",
        "@keyframes fadeIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 2,
        }}
      >
        <Button component={Link} to="/" variant="text" color="primary" size="large" onClick={handleHomeClick}>
          ← Home
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #E5E7EB",
          borderRadius: 2,
          p: { xs: 2, sm: 3 },
          bgcolor: "#fff",
          boxShadow: "0 8px 28px rgba(15, 23, 42, 0.07)",
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
          ...quoteFormFieldDensitySx,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "flex-start" },
            gap: 2,
            mb: 1,
          }}
        >
          <Box sx={{ flex: "0 1 auto", textAlign: "left" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography
                variant="h5"
                component="h1"
                color="primary"
                sx={{ fontWeight: 700, mb: 0.25 }}
              >
                Quote number: QU-{quoteData?.quoteNumber ? quoteData.quoteNumber : "—"}
              </Typography>
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.25 }}>
              Date: {formatDateLong(quoteData.quoteDate)}
            </Typography>
          </Box>
          <Box
            sx={{
              flex: "1 1 min-content",
              maxWidth: { md: 420 },
              minWidth: 0,
              ml: { xs: 0, md: "auto" },
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={700}
              color="primary"
              gutterBottom
              sx={{ mb: 2.5 }}
            >
              My Business details
            </Typography>
            <TextField
              id="field-businessName"
              variant="outlined"
              label="My business name"
              error={!!formErrors.businessName}
              helperText={formErrors.businessName ? "Business name is required" : undefined}
              value={quoteData.businessName ?? ""}
              onChange={(e) => {
                handleInputChange("businessName")(e);
                if (formErrors.businessName) setFormErrors((prev) => { const n = { ...prev }; delete n.businessName; return n; });
              }}
              onBlur={(e) => {
                const raw = e.target.value;
                const normalized = raw.replace(/\s+/g, " ").trim();
                const formatted =
                  normalized === "" ? "" : capitaliseWords(normalized);
                if (formatted !== raw) {
                  updateQuoteData({ businessName: formatted });
                }
              }}
              fullWidth
              slotProps={{
                htmlInput: {
                  autoCapitalize: "words",
                  autoCorrect: "on",
                },
              }}
              sx={{
                mb: 1.5,
                width: { xs: "100%", sm: "100%" }, // force full width on mobile
                "& .MuiInputBase-input": {
                  ...docTitleOutlinedSx["& .MuiInputBase-input"],
                  fontWeight: "normal", // prevent bold styling
                },
              }}
            />
            <TextField
              id="field-businessEmail"
              variant="outlined"
              label="My email address"
              value={quoteData.businessEmail ?? ""}
              onChange={(e) => {
                handleInputChange("businessEmail")({
                  target: { value: e.target.value.toLowerCase() },
                });
                if (formErrors.businessEmail) setFormErrors((prev) => { const n = { ...prev }; delete n.businessEmail; return n; });
              }}
              type="email"
              name="email"
              autoComplete="email"
              inputProps={{ maxLength: 64 }}
              required
              error={!!formErrors.businessEmail}
              helperText={
                formErrors.businessEmail === "required"
                  ? "Email address is required"
                  : formErrors.businessEmail === "invalid"
                    ? "Enter a valid email address"
                    : undefined
              }
              fullWidth
              sx={{
                mb: 1.5,
                width: "100%",
                ml: { xs: 0, sm: "auto" },
                display: { sm: "block" },
              }}
            />
            <Autocomplete
              freeSolo
              options={addressOptions}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.label
              }
              isOptionEqualToValue={(a, b) => {
                if (typeof a === "string" && typeof b === "string") {
                  return a === b;
                }
                return (a && b && typeof a === "object" && typeof b === "object")
                  ? a.id === b.id
                  : false;
              }}
              filterOptions={(opts) => opts}
              inputValue={quoteData.businessAddress ?? ""}
              onInputChange={(e, newInput, reason) => {
                if (reason === "input" || reason === "clear") {
                  updateQuoteData({ businessAddress: newInput });
                  scheduleAddressSearch(newInput);
                } else if (reason === "reset") {
                  updateQuoteData({ businessAddress: newInput });
                  clearAddressOptions();
                }
              }}
              onChange={async (e, newValue) => {
                clearAddressOptions();
                const text = await finalizeAddressSelection(newValue);
                if (text !== null) updateQuoteData({ businessAddress: text });
              }}
              loading={addressLoading || addressResolving}
              loadingText={addressResolving ? "Fetching full address…" : "Searching…"}
              fullWidth
              renderOption={(props, option) => {
                if (typeof option === "string") {
                  return (
                    <li {...props}>
                      {option}
                    </li>
                  );
                }
                return (
                  <li {...props}>
                    <Box
                      sx={{
                        py: 0.75,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 0.25,
                      }}
                    >
                      <Typography variant="body1" fontWeight={600}>
                        {option.primary}
                      </Typography>
                      {option.subtitle ? (
                        <Typography variant="body2" color="text.secondary">
                          {option.subtitle}
                        </Typography>
                      ) : null}
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Address"
                  multiline
                  maxRows={4}
                  fullWidth
                  sx={{
                    mb: { xs: 0, sm: 1.5 },
                    width: { xs: "100%", sm: undefined }, // force full width on mobile
                  }}
                  slotProps={{
                    formHelperText: { sx: { mt: 0.5 } },
                  }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {addressLoading || addressResolving ? (
                          <CircularProgress color="inherit" size={22} sx={{ mr: 1 }} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="subtitle1"
          fontWeight={700}
          color="primary"
          gutterBottom
          sx={{ mb: 2.5 }}
        >
          Prepared for
        </Typography>
        <TextField
          id="field-customerName"
          variant="outlined"
          fullWidth
          label="Customer name"
          error={!!formErrors.customerName}
          helperText={formErrors.customerName ? "Customer name is required" : undefined}
          value={quoteData.customerName ?? ""}
          onChange={(e) => {
            handleInputChange("customerName")(e);
            if (formErrors.customerName) setFormErrors((prev) => { const n = { ...prev }; delete n.customerName; return n; });
          }}
          sx={{ mb: 1.5 }}
        />
        <TextField
          id="field-email"
          variant="outlined"
          fullWidth
          type="email"
          label="Email"
          value={quoteData.email ?? ""}
          error={
            formErrors.email === "invalid"
          }
          helperText={
            formErrors.email === "invalid"
              ? "Please enter a valid email address"
              : undefined
          }
          onChange={(e) => {
            const value = e.target.value;
            handleInputChange("email")({
              target: { value: value.toLowerCase() },
            });
            if (formErrors.email) setFormErrors((prev) => { const n = { ...prev }; delete n.email; return n; });
          }}
          onBlur={(e) => {
            const value = e.target.value.trim().toLowerCase();
            const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!value) {
              setFormErrors((prev) => ({ ...prev, email: "required" }));
            } else if (!EMAIL_RE.test(value)) {
              setFormErrors((prev) => ({ ...prev, email: "invalid" }));
            } else if (formErrors.email) {
              setFormErrors((prev) => { const n = { ...prev }; delete n.email; return n; });
            }
          }}
          sx={{ mb: 1.5 }}
        />

        <TextField
          select
          variant="outlined"
          label="Currency"
          value={activeCurrency}
          onChange={handleInputChange("currency")}
          sx={{ mt: 0.5, width: { xs: "100%", sm: 300 }, maxWidth: "100%" }}
          SelectProps={{
            renderValue: (value) => {
              const opt = CURRENCY_OPTIONS.find((o) => o.code === value);
              if (!opt) return value;
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    aria-hidden
                    sx={{
                      fontSize: "1.25rem",
                      lineHeight: 1,
                      width: "1.35rem",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {opt.region ? getFlagEmoji(opt.region) : ""}
                  </Box>
                  <span>{opt.label}</span>
                </Box>
              );
            },
          }}
        >
          <ListSubheader
            disableSticky
            sx={{ fontWeight: 700, fontSize: "0.9375rem", color: "primary.main" }}
          >
            Popular
          </ListSubheader>
          {POPULAR_CURRENCY_OPTIONS.map((opt) => (
            <MenuItem key={`popular-${opt.code}`} value={opt.code}>
              {currencyMenuRow(opt)}
            </MenuItem>
          ))}
          <ListSubheader
            disableSticky
            sx={{ fontWeight: 700, fontSize: "0.9375rem", color: "primary.main" }}
          >
            All
          </ListSubheader>
          {CURRENCY_OPTIONS.map((opt) => (
            <MenuItem key={`all-${opt.code}`} value={opt.code}>
              {currencyMenuRow(opt)}
            </MenuItem>
          ))}
        </TextField>

        <Divider sx={{ my: 2 }} />

        <Box id="field-lineItems" ref={lineItemsLayoutRef} sx={{ width: "100%", minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} color="primary" mb={1}>
            Quote items
          </Typography>
          <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Add or remove rows. Amount is calculated from price, quantity, and VAT %.
          </Typography>
          {formErrors.lineItems && (
            <Alert
              severity="error"
              sx={{ mb: 1.5 }}
              onClose={() => setFormErrors((prev) => { const n = { ...prev }; delete n.lineItems; return n; })}
            >
              Add at least one line item with a description.
            </Alert>
          )}

          {/* Wrapper so the AI loading overlay covers only the line items area */}
          <Box sx={{ position: "relative" }}>
            {aiParseLoading && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 10,
                  borderRadius: 2,
                  width: "100%",
                  bgcolor: "rgba(255,255,255,0.65)",
                  backdropFilter: "blur(2px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  pointerEvents: "none",
                }}
              >
                <CircularProgress size={32} />
                <Box component="span" sx={{ fontSize: "0.8rem", color: "text.secondary", fontWeight: 500 }}>
                  AI is adding items…
                </Box>
              </Box>
            )}

            <Stack
              spacing={1.5}
              sx={{
                display: lineItemsUseCards ? "flex" : "none",
                width: "100%",
                minWidth: 0,
              }}
            >
              {lineItems.map((row, index) => (
                <Box
                  key={row.id}
                  id={`quote-row-${row.id}`}
                  sx={flashedRowIds.has(row.id) ? {
                    borderRadius: 2,
                    outline: "2px solid",
                    outlineColor: "primary.light",
                    animation: "rowFlash 1.8s ease-out forwards",
                    "@keyframes rowFlash": {
                      "0%": { outlineColor: "primary.main", backgroundColor: "#E0ECFF" },
                      "100%": { outlineColor: "transparent", backgroundColor: "transparent" },
                    },
                  } : undefined}
                >
                  <QuoteLineItemRow
                    variant="card"
                    row={row}
                    index={index}
                    lineItems={lineItems}
                    activeCurrency={activeCurrency}
                    formatMoney={formatMoney}
                    updateLineField={updateLineField}
                    removeLineItem={removeLineItem}
                  />
                </Box>
              ))}
            </Stack>

            <TableContainer
              sx={{
                display: lineItemsUseCards ? "none" : "block",
                overflowX: "auto",
                mx: -0.5,
              }}
            >
              <Table
                size="medium"
                sx={{
                  tableLayout: "fixed",
                  width: "100%",
                  minWidth: 700,
                }}
              >
                <TableBody>
                  {lineItems.map((row, index) => (
                    <QuoteLineItemRow
                      key={row.id}
                      id={`quote-row-${row.id}`}
                      variant="table"
                      row={row}
                      index={index}
                      lineItems={lineItems}
                      activeCurrency={activeCurrency}
                      formatMoney={formatMoney}
                      updateLineField={updateLineField}
                      removeLineItem={removeLineItem}
                      flash={flashedRowIds.has(row.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
        <Stack spacing={1.5} sx={{ mt: 1, alignSelf: "stretch", width: "100%" }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ alignItems: "center" }}>
            <Button
              size="medium"
              startIcon={<AddIcon />}
              onClick={addLineItem}
              sx={{
                border: "1px solid",
                borderColor: "primary.main",
              }}
            >
              Add item
            </Button>
            {!aiQuotaExhausted ? (
              <Button
                size="medium"
                startIcon={<AutoAwesome />}
                onClick={() => setShowAiLineSection((open) => !open)}
                sx={{
                  border: "2px solid",
                  borderColor: "primary.main",
                  bgcolor: "primary.main",
                  color: "#fff",
                  fontWeight: 600,
                  "&:hover": {
                    bgcolor: "primary.dark",
                    color: "#fff",
                    borderColor: "primary.dark",
                  },
                  boxShadow: "0 2px 6px 0 rgba(120, 144, 156, 0.12)",
                  transition: "all 0.13s",
                }}
              >
                {showAiLineSection ? "Hide AI" : "Add with AI"}
              </Button>
            ) : null}
          </Stack>
          {showAiLineSection ? (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "linear-gradient(90deg, #e9f2fd 0%, #fff 100%)",
                borderColor: "primary.light",
                boxShadow: "0px 4px 20px 0px rgba(110, 188, 255, 0.08)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <AutoAwesome sx={{ fontSize: 22, color: "primary.main" }} />
                <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                  AI-powered add quote item
                </Typography>
              </Stack>
              {aiParseError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {aiParseError}
                </Alert>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                One or more charges per message, e.g. &quot;£120 Garden landscaping&quot; or several lines. Press <b>Enter</b> to send, <b>Shift+Enter</b> for a new line.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ sm: "flex-start" }}
                sx={{
                  bgcolor: "primary.main",  // Use the primary button color as background
                  borderRadius: 2,
                  // border removed as per new instruction
                  transition: "border-color 0.2s",
                  px: 1,
                  py: 1,
                  boxShadow: aiParseLoading ? "0 0 0 2px rgb(212, 228, 241)" : "none",
                }}
              >
                <AiPromptField
                  value={nlLineChatInput}
                  onChange={(val) => {
                    setNlLineChatInput(val);
                    if (nlChatFieldError) setNlChatFieldError(false);
                  }}
                  onSubmit={handleNlChatAddLines}
                  loading={aiParseLoading}
                  error={nlChatFieldError}
                  inputRef={nlLineChatInputRef}
                  minRows={3}
                  maxRows={8}
                  rootSx={{ flex: "1 1 auto", minWidth: 0, borderRadius: 2, bgcolor: "#fff" }}
                  overlaySx={{ borderRadius: 2, top: "16.5px", bottom: "16.5px", left: "14px", right: "14px", overflow: "auto" }}
                  textFieldSx={{
                    "& .MuiOutlinedInput-root": { bgcolor: "transparent" },
                    "& .MuiInputBase-input": {
                      bgcolor: "transparent",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      padding: "12.5px 14px", // standard text field input padding (top/bottom, left/right)
                      boxSizing: "border-box",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    },
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                    aiParseLoading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <AutoAwesome />
                    )
                  }
                  onClick={handleNlChatAddLines}
                  sx={{
                    flexShrink: 0,
                    minWidth: { sm: 140 },
                    boxShadow: "0px 2px 8px 0px rgba(110, 188, 255, 0.09)",
                    fontWeight: 600,
                    letterSpacing: 0.2,
                    bgcolor: "#fff",           // Button background is white
                    color: "primary.main",      // Text/icon color is the primary button color
                    "&:hover": {
                      bgcolor: "#f3f4f6",
                    },
                  }}
                >
                  Add to quote
                </Button>
              </Stack>
            </Paper>
          ) : null}
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.4 }}>
          <Typography variant="body1" color="#4B5563">
            Subtotal (ex VAT)
          </Typography>
          <Typography variant="body1" color="#111827" fontWeight={600}>
            {formatMoney(pricing.subtotal)}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.4 }}>
          <Typography variant="body1" color="#4B5563">
            VAT
          </Typography>
          <Typography variant="body1" color="#111827" fontWeight={600}>
            {formatMoney(pricing.tax)}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.3 }}>
          <Typography variant="h6" component="p" color="#111827" fontWeight={800} sx={{ fontSize: "1.2rem" }}>
            Total (inc VAT)
          </Typography>
          <Typography variant="h6" component="p" color="#111827" fontWeight={800} sx={{ fontSize: "1.2rem" }}>
            {formatMoney(pricing.total)}
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" spacing={1.5} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleOpenWaitlist}
            disabled={usageChecking || sendingVerificationCode}
            startIcon={
              usageChecking || sendingVerificationCode
                ? <CircularProgress size={18} color="inherit" />
                : <FontAwesomeIcon icon={faPaperPlane} />
            }
            sx={{
              minHeight: 48,
              px: 2.5,
              fontSize: "1.0625rem",
              flex: { sm: "0 1 280px", xs: "1 0 100%" },
              width: { xs: "100%", sm: "auto" },
              minWidth: 0,
              maxWidth: { sm: 200 },
              bgcolor: "#10A86B", 
              color: "#fff",
              "&:hover": {
                bgcolor: "#13C47A",
              },
            }}
          >
            {usageChecking || sendingVerificationCode ? "Sending…" : "Send quote"}
          </Button>
        </Stack>
      </Paper>

      {/* Leave confirmation dialog */}
      <Dialog open={leaveDialogOpen} onClose={handleCancelLeave} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#083a6b" }}>Leave this page?</DialogTitle>
        <DialogContent>
          <Typography>Your quote will be cleared and cannot be recovered.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleCancelLeave} color="inherit">Stay</Button>
          <Button onClick={handleConfirmLeave} variant="contained" color="error">Leave & clear</Button>
        </DialogActions>
      </Dialog>

      {/* Email verification before allowing send */}
      <Dialog
        open={verifyDialogOpen}
        onClose={() => {
          if (!verifyDialogLoading && !sendingVerificationCode) closeVerifyDialog();
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            color: "#083a6b",
            fontSize: "1.2rem",
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Verify your email
          <IconButton
            aria-label="Close verification dialog"
            onClick={closeVerifyDialog}
            disabled={verifyDialogLoading || sendingVerificationCode}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ ...quoteFormFieldDensitySx, pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Enter the <Box component="span" sx={{ fontWeight: 700 }}>6-digit code</Box> sent to{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>{verificationEmail || "your email"}</Box> to continue.
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ fontWeight: 700, mb: 3 }}
          >
            If you do not see the code, please check your junk/spam folder.
          </Typography>
          <TextField
            label="Verification code"
            fullWidth
            autoFocus
            autoComplete="off"
            value={verifyCode}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
              setVerifyCode(digitsOnly);
              if (verifyDialogError) setVerifyDialogError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmVerification();
            }}
            inputProps={{
              autoComplete: "off",
              inputMode: "numeric",
              pattern: "[0-9]*",
              maxLength: 6,
            }}
            error={!!verifyDialogError}
            helperText={
              verifyDialogError === "missing_code"
                ? (
                  <>
                    Enter the <Box component="span" sx={{ fontWeight: 700 }}>6-digit code</Box> sent to your email.
                  </>
                )
                : verifyDialogError || " "
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0, gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Box sx={{ display: "flex", gap: 2, ml: "auto", alignItems: "center" }}>
            <Button
              size="large"
              variant="text"
              onClick={handleResendVerificationCode}
              disabled={
                verifyDialogLoading ||
                sendingVerificationCode ||
                resendBlocked ||
                !verificationEmail
              }
              sx={{ fontSize: "14px" }}
            >
              {sendingVerificationCode
                ? "Resending…"
                : resendBlocked
                  ? `Resend code in ${resendSecondsLeft}s`
                  : "Resend code"}
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={handleConfirmVerification}
              disabled={verifyDialogLoading || sendingVerificationCode}
              sx={{ fontSize: "1.0625rem" }}
            >
                Continue
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Waitlist Dialog (WITHOUT Export as PDF button) */}
      <Dialog open={waitlistOpen} onClose={handleCloseWaitlist} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, color: "#083a6b", fontSize: "1.35rem", py: 2 }}>
          Join the waitlist
        </DialogTitle>
        <DialogContent sx={{ ...quoteFormFieldDensitySx, pt: 0 }}>
          {waitlistSuccess ? (
            <Typography variant="body1" sx={{ pt: 0.5 }}>
              You&apos;re on the list! We&apos;ll email you when we launch.
            </Typography>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                It looks like you’ve reached the limit of 3 quotes. To send more, you’ll need to upgrade to a paid package. Join the waitlist to be notified when this feature becomes available.
              </Typography>
              <TextField
                id="quoteGeneratorWaitlistEmail"
                label="Email address"
                type="email"
                fullWidth
                autoFocus
                value={waitlistEmail}
                onChange={(e) => {
                  setWaitlistEmail(e.target.value);
                  setWaitlistEmailError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleWaitlistSubmit();
                }}
                error={waitlistEmailError}
                helperText={
                  waitlistEmailError
                    ? "Enter a valid email address (e.g. name@example.com)"
                    : ""
                }
              />
              {validateWaitlistEmail(waitlistEmail) && showRecaptcha && recaptchaSiteKey && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <ReCAPTCHA sitekey={recaptchaSiteKey} onChange={(v) => setRecaptchaVerified(!!v)} />
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 0,
            flexDirection: "column",
            alignItems: "stretch",
            gap: 1.5,
          }}
        >
          {waitlistSuccess ? (
            <Button variant="contained" size="large" onClick={handleCloseWaitlist} fullWidth sx={{ fontSize: "1.0625rem" }}>
              Close
            </Button>
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: 1,
                width: "100%",
              }}
            >
              <Button size="large" onClick={handleCloseWaitlist} color="inherit" sx={{ fontSize: "1.0625rem" }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleWaitlistSubmit}
                disabled={waitlistSubmitting}
                sx={{ fontSize: "1.0625rem" }}
              >
                {waitlistSubmitting ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={22} color="inherit" />
                    Joining…
                  </Box>
                ) : (
                  "Join the waitlist"
                )}
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>

      {/* Export / Share PDF Dialog */}
      <Dialog open={exportPdfDialogOpen} onClose={handleCloseExportPdfDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, color: "#083a6b", fontSize: "1.15rem", py: 2 }}>
          Share your quote
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Your quote has been generated as a PDF, click the button to download or share it. 
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, flexDirection: "column", alignItems: "stretch", gap: 1 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleExportPdf}
            startIcon={<FontAwesomeIcon icon={typeof navigator !== "undefined" && navigator.maxTouchPoints > 0  ? faShare : faDownload} />}
            sx={{ fontSize: "1.0625rem" }}
          >
            {typeof navigator !== "undefined" && navigator.maxTouchPoints > 0 ? "Share Quote" : "Download PDF"}
          </Button>
          <Button variant="text" size="large" fullWidth onClick={handleCloseExportPdfDialog} color="inherit" sx={{ fontSize: "1.0625rem" }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuoteGenerator;
