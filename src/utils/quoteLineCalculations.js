/** Non-negative whole number for item count; default 1 when unset. */
export function lineQuantityDisplay(row) {
  if (row.quantity === undefined || row.quantity === null) return 1;
  const n = Number(row.quantity);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 1;
}

export function lineNet(row) {
  const p = Number(row.unitPrice) || 0;
  const qty = lineQuantityDisplay(row);
  return p * qty;
}

export function lineVatAmount(row) {
  const net = lineNet(row);
  const v = Number(row.vatPercent);
  const pct = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
  return net * (pct / 100);
}

/** Line total inc VAT — used for the Amount column and PDF. */
export function lineGross(row) {
  const g = lineNet(row) + lineVatAmount(row);
  return Math.round((g + Number.EPSILON) * 100) / 100;
}
