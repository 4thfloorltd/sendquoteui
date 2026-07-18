export const normalizeCustomerValue = (value) =>
  String(value ?? "").trim().toLowerCase();

export const getCustomerEmail = (document) =>
  String(document?.customerEmail ?? document?.email ?? "").trim();

export const getCustomerKey = (document) => {
  const email = normalizeCustomerValue(getCustomerEmail(document));
  if (email) return `email:${email}`;

  const name = normalizeCustomerValue(document?.customerName);
  return name ? `name:${name}` : "";
};

/** Quote form uses `email` for customer email; Firestore docs use `customerEmail`. */
export const getCustomerKeyFromQuoteData = (quoteData) =>
  getCustomerKey({
    customerName: quoteData?.customerName,
    customerEmail: quoteData?.email ?? quoteData?.customerEmail,
  });

export const getDocumentActivityTime = (document, kind) => {
  const timestamp =
    document?.updatedAt?.toMillis?.()
    ?? document?.createdAt?.toMillis?.();
  if (timestamp) return timestamp;

  const dateValue = kind === "invoice"
    ? document?.invoiceDate
    : document?.quoteDate;
  const parsed = dateValue ? Date.parse(`${dateValue}T12:00:00`) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getCustomerInitials = (name, email) => {
  const source = String(name || email || "?").trim();
  const words = source.split(/\s+/).filter(Boolean);
  return (words.length > 1
    ? `${words[0][0]}${words[1][0]}`
    : source.slice(0, 2)
  ).toUpperCase();
};
