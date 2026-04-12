import { useEffect, useState } from "react";
import { FREE_QUOTE_LIMIT } from "../../constants/plan";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../firebase";
import SubscribeDialog from "../../components/SubscribeDialog";

const FREE_QUOTA = FREE_QUOTE_LIMIT;

const PlanFeature = ({ text }) => (
  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1.25 }}>
    <CheckCircleOutlineIcon sx={{ color: "#10A86B", fontSize: 20, mt: "2px", flexShrink: 0 }} />
    <Typography variant="body2" sx={{ fontSize: "0.95rem" }}>{text}</Typography>
  </Stack>
);

const PlanFeatureMissing = ({ text }) => (
  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1.25 }}>
    <CancelOutlinedIcon sx={{ color: "#CBD5E1", fontSize: 20, mt: "2px", flexShrink: 0 }} />
    <Typography variant="body2" sx={{ fontSize: "0.95rem", color: "text.secondary" }}>{text}</Typography>
  </Stack>
);

export default function Billing() {
  const [openQuoteCount, setOpenQuoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    let unsubQuotes = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubQuotes?.();
      if (!user) { setLoading(false); return; }
      unsubQuotes = onSnapshot(
        query(collection(db, "quotes"), where("userId", "==", user.uid)),
        (snap) => {
          const open = snap.docs.filter(
            (d) => !d.data().deleted && d.data().status === "pending",
          ).length;
          setOpenQuoteCount(open);
          setLoading(false);
        },
        () => setLoading(false),
      );
    });
    return () => { unsubAuth(); unsubQuotes?.(); };
  }, []);

  const handleUpgradeSuccess = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), { plan: "premium", updatedAt: serverTimestamp() }, { merge: true });
    setSubscribed(true);
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: "#083a6b", mb: 0.5 }}>
        Billing
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4, fontSize: "0.95rem" }}>
        Manage your plan and usage.
      </Typography>

      {/* Usage summary */}
      {!loading && (
        <Paper
          elevation={0}
          sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: 2.5, mb: 4, bgcolor: "#F8FAFC" }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#374151", mb: 0.5 }}>
            Current usage
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Box component="span" sx={{ fontWeight: 700, color: openQuoteCount >= FREE_QUOTA ? "#EF4444" : "#083a6b" }}>
              {openQuoteCount}
            </Box>
            {" "}of{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>{FREE_QUOTA}</Box>
            {" "}open quotes used
            {openQuoteCount >= FREE_QUOTA && (
              <Box component="span" sx={{ color: "#EF4444", fontWeight: 600 }}>
                {" "}— limit reached
              </Box>
            )}
          </Typography>
        </Paper>
      )}

      {subscribed && (
        <Alert severity="success" sx={{ mb: 3 }}>
          You are now on Premium! Enjoy unlimited open quotes.
        </Alert>
      )}

      {/* Plan cards */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        {/* Free plan */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 3,
            borderRadius: 3,
            border: "1px solid #E5E7EB",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#083a6b" }}>
              Free Plan
            </Typography>
            {!subscribed && (
              <Chip label="Current plan" color="success" size="small" sx={{ fontWeight: 700 }} />
            )}
          </Stack>

          <Typography variant="h4" sx={{ fontWeight: 800, color: "#083a6b", mb: 0.5 }}>
            £0
            <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
              /month
            </Typography>
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2.5 }}>
            No credit card required
          </Typography>

          <Divider sx={{ mb: 2.5 }} />

          <PlanFeature text={`Up to ${FREE_QUOTA} open quotes at a time`} />
          <PlanFeature text="Customer accept / decline tracking" />
          <PlanFeature text="PDF download for every quote" />
          <PlanFeature text="Delete quotes to free up space" />
          <PlanFeatureMissing text="Edit sent quotes" />
          <PlanFeatureMissing text="Search quote by name, email or quote ID" />
          <PlanFeatureMissing text="PDF import to pre-fill quotes" />
          <PlanFeatureMissing text="Ad-free experience" />

          <Box sx={{ flex: 1 }} />
        </Paper>

        {/* Premium plan */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 3,
            borderRadius: 3,
            border: "2px solid #083a6b",
            bgcolor: "#F0F4FF",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#083a6b" }}>
              Premium Plan
            </Typography>
            {subscribed ? (
              <Chip
                label="Current plan"
                color="success"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            ) : (
              <Chip
                icon={<StarOutlineIcon sx={{ fontSize: 16 }} />}
                label="Recommended"
                size="small"
                sx={{ fontWeight: 700, bgcolor: "#083a6b", color: "#fff", "& .MuiChip-icon": { color: "#fff" } }}
              />
            )}
          </Stack>

          <Typography variant="h4" sx={{ fontWeight: 800, color: "#083a6b", mb: 0.5 }}>
            £9.99
            <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
              /month
            </Typography>
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2.5 }}>
            Cancel any time
          </Typography>

          <Divider sx={{ mb: 2.5 }} />

          <PlanFeature text="Unlimited open quotes" />
          <PlanFeature text="Customer accept / decline tracking" />
          <PlanFeature text="PDF download for every quote" />
          <PlanFeature text="Edit sent quotes" />
          <PlanFeature text="Search quote by name, email or quote ID" />
          <PlanFeature text="PDF import to pre-fill quotes" />
          <PlanFeature text="Ad-free experience" />
          <PlanFeature text="Priority support" />

          <Box sx={{ flex: 1 }} />

          {!subscribed && (
            <Button
              variant="contained"
              fullWidth
              onClick={() => setSubscribeOpen(true)}
              sx={{
                mt: 3,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "1rem",
                bgcolor: "#083a6b",
                "&:hover": { bgcolor: "#062d52" },
              }}
            >
              Upgrade to Premium — £9.99/mo
            </Button>
          )}
        </Paper>
      </Stack>

      <SubscribeDialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        onSuccess={handleUpgradeSuccess}
        successCta="Back to billing"
        initialStep={2}
      />
    </Box>
  );
}
