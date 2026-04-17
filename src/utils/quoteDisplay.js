/** Long date for quote UI and PDFs (e.g. 12 May 2026). */
export const formatDateLong = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/** Returns a formatter for quote amounts in the given ISO currency. */
export const createFormatMoney = (currency = "GBP") => (amount) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amount);
