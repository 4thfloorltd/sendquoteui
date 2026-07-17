/**
 * Pending / unpaid — cool indigo (neutral “awaiting”, distinct from success / error).
 * Pairs with dashboard metric tiles via AWAITING_STATUS_METRIC_*.
 */
export const AWAITING_STATUS_CHIP_SX = {
  bgcolor: "#EEF2FF",
  color: "#3730A3",
  border: "1px solid rgba(99, 102, 241, 0.32)",
};

/** Metric row: icon colour */
export const AWAITING_STATUS_METRIC_ICON_COLOR = "#4F46E5";

/** Metric row: tile background */
export const AWAITING_STATUS_METRIC_BG = "#EEF2FF";

/** "Back to quotes" on `/secured/quote` and `/secured/quote/:id` - keep vertical alignment identical. */
export const SECURED_BACK_TO_QUOTES_BUTTON_SX = {
  alignSelf: "flex-start",
  mb: 2,
  mt: 0,
  color: "#083a6b",
  textTransform: "none",
  fontWeight: 600,
  px: 1,
  pt: 1,
  minWidth: 0,
  display: "inline-flex",
  verticalAlign: "top",
  "&:hover": { bgcolor: "rgba(8, 58, 107, 0.06)" },
};

/** "Back to invoices" on `/secured/invoice` — align with quotes back button. */
export const SECURED_BACK_TO_INVOICES_BUTTON_SX = {
  alignSelf: "flex-start",
  mb: 2,
  mt: 0,
  color: "#083a6b",
  textTransform: "none",
  fontWeight: 600,
  px: 1,
  pt: 1,
  minWidth: 0,
  display: "inline-flex",
  verticalAlign: "top",
  "&:hover": { bgcolor: "rgba(8, 58, 107, 0.06)" },
};
