import { newLineItemId } from "../context/QuoteContext";
import { getDefaultVatPercent } from "./currency";

export function mapParsedLinesToQuoteItems(lines, options = {}) {
  if (!Array.isArray(lines)) {
    throw new Error("lines must be an array");
  }
  const fallbackVat = options.defaultVatPercent ?? getDefaultVatPercent();
  const rows = lines
    .filter((line) => line && typeof line === "object")
    .map((line) => {
      const description = String(line.description ?? "").trim();
      const unitPrice = Math.max(0, Number(line.unitPrice) || 0);
      const quantity = Math.max(1, Math.trunc(Number(line.quantity) || 1));
      const vatPercent = Number.isFinite(Number(line.vatPercent))
        ? Math.max(0, Number(line.vatPercent))
        : fallbackVat;
      return {
        id: newLineItemId(),
        description,
        unitPrice,
        quantity,
        vatPercent,
      };
    })
    .filter((row) => row.description.length > 0);

  return rows;
}
