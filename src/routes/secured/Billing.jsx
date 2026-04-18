import { useEffect, useRef, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { FREE_QUOTE_LIMIT } from "../../constants/plan";
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../../constants/site";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SettingsIcon from "@mui/icons-material/Settings";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../../../firebase";
import PricingPlanComparison from "../../components/PricingPlanComparison";
import SubscribeDialog from "../../components/SubscribeDialog";
import { formatPremiumMonthlyDisplay } from "../../helpers/currency";

const FREE_QUOTA = FREE_QUOTE_LIMIT;

const STATUS_LABELS = {
  active:   { label: "Active",          color: "success" },
  trialing: { label: "Trial",           color: "info"    },
  past_due: { label: "Payment overdue", color: "warning" },
  canceled: { label: "Canceled",        color: "default" },
  unpaid:   { label: "Unpaid",          color: "error"   },
  paused:   { label: "Paused",          color: "default" },
};

/** Scroll target: full Free + Premium comparison (scroll aligns bottom into view). */
const BILLING_PLANS_SECTION_ID = "billing-plans-section";

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const checkoutResult = useRef(searchParams.get("checkout"));
  const didScrollToPremium = useRef(false);

  const [openQuoteCount, setOpenQuoteCount] = useState(0);
  const [loading, setLoading]               = useState(true);
  const [plan, setPlan]                     = useState("free");
  const [planStatus, setPlanStatus]         = useState(null);
  const [planPeriodEnd, setPlanPeriodEnd]   = useState(null);

  const [portalLoading, setPortalLoading]   = useState(false);
  const [actionError, setActionError]       = useState("");
  const [subscribeOpen, setSubscribeOpen]   = useState(false);

  useEffect(() => {
    if (checkoutResult.current) {
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      setSearchParams(next, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (location.state?.scrollToPremium !== true || didScrollToPremium.current) return;
    didScrollToPremium.current = true;
    // Double rAF + short delay so layout (usage card, alerts) is painted before measuring.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(() => {
          document.getElementById(BILLING_PLANS_SECTION_ID)?.scrollIntoView({
            behavior: "smooth",
            block: "end",
            inline: "nearest",
          });
        }, 50);
      });
    });
  }, [location.state?.scrollToPremium]);

  useEffect(() => {
    let unsubQuotes = null;
    let unsubUser   = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubQuotes?.();
      unsubUser?.();
      if (!user) { setLoading(false); return; }

      unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
        const data = snap.data() || {};
        setPlan(data.plan ?? "free");
        setPlanStatus(data.planStatus ?? null);
        setPlanPeriodEnd(data.planPeriodEnd?.toDate?.() ?? null);
      });

      unsubQuotes = onSnapshot(
        query(collection(db, "quotes"), where("userId", "==", user.uid)),
        (snap) => {
          const open = snap.docs.filter((d) => !d.data().deleted).length;
          setOpenQuoteCount(open);
          setLoading(false);
        },
        () => setLoading(false),
      );
    });
    return () => { unsubAuth(); unsubQuotes?.(); unsubUser?.(); };
  }, []);

  const handleManage = async () => {
    setPortalLoading(true);
    setActionError("");
    try {
      const { data } = await httpsCallable(functions, "createPortalSession")();
      window.location.href = data.url;
    } catch (err) {
      setActionError(err.message ?? "Failed to open billing portal. Please try again.");
      setPortalLoading(false);
    }
  };

  const isPremium  = plan === "premium";
  const statusMeta = STATUS_LABELS[planStatus] ?? null;
  const periodFmt  = planPeriodEnd
    ? planPeriodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <Box sx={{ maxWidth: APP_PAGE_CONTENT_MAX_WIDTH, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: "#083a6b", mb: 0.5 }}>
        Billing
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Manage your plan and usage.
      </Typography>

      {checkoutResult.current === "success" && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Payment successful — you&apos;re now on Premium! It may take a few seconds to reflect.
        </Alert>
      )}
      {checkoutResult.current === "cancel" && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Checkout was cancelled. You can upgrade any time below.
        </Alert>
      )}

      {planStatus === "past_due" && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          action={
            <Button size="small" onClick={handleManage} disabled={portalLoading}
              sx={{ textTransform: "none", fontWeight: 700 }}>
              {portalLoading ? <CircularProgress size={14} /> : "Update payment"}
            </Button>
          }
          sx={{ mb: 3 }}
        >
          Your last payment failed. Please update your payment method to keep Premium access.
        </Alert>
      )}

      {!loading && (
        <Paper elevation={0}
          sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: 2.5, mb: 4, bgcolor: "#F8FAFC" }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#374151", mb: 0.5 }}>
            Current usage
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Box component="span"
              sx={{ fontWeight: 700, color: !isPremium && openQuoteCount >= FREE_QUOTA ? "#EF4444" : "#083a6b" }}>
              {openQuoteCount}
            </Box>
            {isPremium ? (
              <> quotes &mdash; <Box component="span" sx={{ color: "#10A86B", fontWeight: 700 }}>unlimited</Box></>
            ) : (
              <>
                {" "}of <Box component="span" sx={{ fontWeight: 700 }}>{FREE_QUOTA}</Box> quotes used
                {openQuoteCount >= FREE_QUOTA && (
                  <Box component="span" sx={{ color: "#EF4444", fontWeight: 600 }}> - limit reached</Box>
                )}
              </>
            )}
          </Typography>
        </Paper>
      )}

      {actionError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionError("")}>
          {actionError}
        </Alert>
      )}

      <Box
        id={BILLING_PLANS_SECTION_ID}
        sx={{
          scrollMarginTop: "88px",
          scrollMarginBottom: { xs: "100px", md: "32px" },
        }}
      >
        <PricingPlanComparison
          freeHeaderAddon={!isPremium ? <Chip label="Current plan" color="success" size="small" sx={{ fontWeight: 700 }} /> : null}
          premiumHeaderAddon={isPremium ? (
            <Stack direction="row" spacing={1} alignItems="center">
              {statusMeta && <Chip label={statusMeta.label} color={statusMeta.color} size="small" sx={{ fontWeight: 700 }} />}
              <Chip label="Current plan" color="success" size="small" sx={{ fontWeight: 700 }} />
            </Stack>
          ) : (
            <Chip
              icon={<StarOutlineIcon sx={{ fontSize: 16 }} />}
              label="Recommended"
              size="small"
              sx={{ fontWeight: 700, bgcolor: "#083a6b", color: "#fff", "& .MuiChip-icon": { color: "#fff" } }}
            />
          )}
          freeFooter={null}
          premiumFooter={isPremium ? (
            <Stack spacing={1.5} sx={{ mt: 3 }}>
              {periodFmt && (
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  {planStatus === "canceled" ? `Access until ${periodFmt}` : `Next renewal: ${periodFmt}`}
                </Typography>
              )}
              <Button variant="outlined" fullWidth onClick={handleManage} disabled={portalLoading}
                startIcon={portalLoading ? null : <SettingsIcon sx={{ fontSize: 18 }} />}
                endIcon={portalLoading ? null : <OpenInNewIcon sx={{ fontSize: 14 }} />}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.95rem", borderColor: "#083a6b", color: "#083a6b", "&:hover": { borderColor: "#062d52", bgcolor: "rgba(8,58,107,0.04)" } }}>
                {portalLoading ? <CircularProgress size={18} /> : "Manage subscription"}
              </Button>
            </Stack>
          ) : (
            <Button variant="contained" fullWidth onClick={() => setSubscribeOpen(true)}
              sx={{ mt: 3, textTransform: "none", fontWeight: 700, fontSize: "1rem", bgcolor: "#083a6b", "&:hover": { bgcolor: "#062d52" } }}>
              Upgrade to Premium — {formatPremiumMonthlyDisplay()}/mo
            </Button>
          )}
        />
      </Box>

      <SubscribeDialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        skipOverview
      />
    </Box>
  );
}
