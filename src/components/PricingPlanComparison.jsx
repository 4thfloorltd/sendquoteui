import {
  Box,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { getFreePlanComparisonRows, PREMIUM_PLAN_FEATURES } from "../constants/plan";
import { formatFreePlanPriceDisplay, formatPremiumMonthlyDisplay } from "../helpers/currency";

export const PlanFeature = ({ text }) => (
  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1.25 }}>
    <CheckCircleOutlineIcon sx={{ color: "#10A86B", fontSize: 20, mt: "2px", flexShrink: 0 }} />
    <Typography variant="body2" sx={{ fontSize: "0.95rem" }}>{text}</Typography>
  </Stack>
);

export const PlanFeatureMissing = ({ text }) => (
  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1.25 }}>
    <CancelOutlinedIcon sx={{ color: "#CBD5E1", fontSize: 20, mt: "2px", flexShrink: 0 }} />
    <Typography variant="body2" sx={{ fontSize: "0.95rem", color: "text.secondary" }}>{text}</Typography>
  </Stack>
);

/**
 * Free vs Premium comparison (same content as Billing plan cards).
 */
export default function PricingPlanComparison({
  freeHeaderAddon = null,
  premiumHeaderAddon = null,
  freeFooter = null,
  premiumFooter = null,
}) {
  const freePriceLabel = formatFreePlanPriceDisplay();
  const premiumPriceLabel = formatPremiumMonthlyDisplay();

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
      <Paper elevation={0} sx={{ flex: 1, p: 3, borderRadius: 3, border: "1px solid #E5E7EB", display: "flex", flexDirection: "column" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#083a6b" }}>Free Plan</Typography>
          {freeHeaderAddon}
        </Stack>

        <Typography variant="h4" sx={{ fontWeight: 800, color: "#083a6b", mb: 0.5 }}>
          {freePriceLabel}
          <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>/month</Typography>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2.5 }}>
          No billing required
        </Typography>
        <Divider sx={{ mb: 2.5 }} />

        {getFreePlanComparisonRows().map(({ text, included }) =>
          included ? (
            <PlanFeature key={text} text={text} />
          ) : (
            <PlanFeatureMissing key={text} text={text} />
          ),
        )}
        <Box sx={{ flex: 1 }} />
        {freeFooter}
      </Paper>

      <Paper elevation={0} sx={{ flex: 1, p: 3, borderRadius: 3, border: "2px solid #083a6b", bgcolor: "#F0F4FF", display: "flex", flexDirection: "column" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#083a6b" }}>Premium Plan</Typography>
          {premiumHeaderAddon}
        </Stack>

        <Typography variant="h4" sx={{ fontWeight: 800, color: "#083a6b", mb: 0.5 }}>
          {premiumPriceLabel}
          <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>/month</Typography>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2.5 }}>
          Cancel any time
        </Typography>
        <Divider sx={{ mb: 2.5 }} />

        {PREMIUM_PLAN_FEATURES.map((text) => (
          <PlanFeature key={text} text={text} />
        ))}
        <Box sx={{ flex: 1 }} />
        {premiumFooter}
      </Paper>
    </Stack>
  );
}
