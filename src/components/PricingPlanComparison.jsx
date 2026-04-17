import {
  Box,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { FREE_QUOTE_LIMIT } from "../constants/plan";

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
 * @param {{ freeHeaderAddon?: React.ReactNode; premiumHeaderAddon?: React.ReactNode; freeFooter?: React.ReactNode; premiumFooter?: React.ReactNode }} props
 */
export default function PricingPlanComparison({
  freeHeaderAddon = null,
  premiumHeaderAddon = null,
  freeFooter = null,
  premiumFooter = null,
}) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
      <Paper elevation={0} sx={{ flex: 1, p: 3, borderRadius: 3, border: "1px solid #E5E7EB", display: "flex", flexDirection: "column" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#083a6b" }}>Free Plan</Typography>
          {freeHeaderAddon}
        </Stack>

        <Typography variant="h4" sx={{ fontWeight: 800, color: "#083a6b", mb: 0.5 }}>
          £0
          <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>/month</Typography>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2.5 }}>
          No credit card required
        </Typography>
        <Divider sx={{ mb: 2.5 }} />

        <PlanFeature text={`Up to ${FREE_QUOTE_LIMIT} open quotes at a time`} />
        <PlanFeature text="Customer accept / decline tracking" />
        <PlanFeature text="PDF download for every quote" />
        <PlanFeature text="Delete quotes to free up space" />
        <PlanFeatureMissing text="Edit sent quotes" />
        <PlanFeatureMissing text="PDF import to pre-fill quotes" />
        <Box sx={{ flex: 1 }} />
        {freeFooter}
      </Paper>

      <Paper elevation={0} sx={{ flex: 1, p: 3, borderRadius: 3, border: "2px solid #083a6b", bgcolor: "#F0F4FF", display: "flex", flexDirection: "column" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#083a6b" }}>Premium Plan</Typography>
          {premiumHeaderAddon}
        </Stack>

        <Typography variant="h4" sx={{ fontWeight: 800, color: "#083a6b", mb: 0.5 }}>
          £9.99
          <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>/month</Typography>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2.5 }}>
          Cancel any time
        </Typography>
        <Divider sx={{ mb: 2.5 }} />

        <PlanFeature text="Unlimited open quotes" />
        <PlanFeature text="Customer accept / decline tracking" />
        <PlanFeature text="PDF download for every quote" />
        <PlanFeature text="Edit sent quotes" />
        <PlanFeature text="PDF import to pre-fill quotes" />
        <PlanFeature text="Priority support" />
        <Box sx={{ flex: 1 }} />
        {premiumFooter}
      </Paper>
    </Stack>
  );
}
