/** Maximum number of non-deleted quotes on the free plan (all statuses count). */
export const FREE_QUOTE_LIMIT = 3;

/** Premium plan feature bullets - keep in sync across pricing UI and subscribe dialog. */
export const PREMIUM_PLAN_FEATURES = [
  "Unlimited quotes",
  "Customer accept / decline tracking",
  "PDF download for every quote",
  "Edit sent quotes",
  "Delete sent quotes",
  "PDF import to pre-fill quotes",
  "Priority support",
];

/**
 * Free plan rows for pricing comparison (`included` = checkmark, else grey X).
 * Copy stresses the quote cap and what Premium adds.
 */
export function getFreePlanComparisonRows() {
  const cap = FREE_QUOTE_LIMIT;
  return [
    { text: `Only ${cap} quotes at a time - upgrade for unlimited`, included: true },
    { text: "Customer accept / decline tracking", included: true },
    { text: "PDF download for every quote", included: true },
    { text: "Delete quotes to free up space", included: true },
    { text: "Edit sent quotes", included: false },
    { text: "PDF import to pre-fill quotes", included: false },
  ];
}
