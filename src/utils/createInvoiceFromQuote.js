import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { app } from "../../firebase";

const region =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";

let functionsInstance;

function getFunctionsInstance() {
  if (!functionsInstance) {
    functionsInstance = getFunctions(app, region);
    if (import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === "true") {
      connectFunctionsEmulator(functionsInstance, "127.0.0.1", 5001);
    }
  }
  return functionsInstance;
}

/**
 * Creates an invoice from a quote via Cloud Function (Admin SDK transaction).
 * Avoids client Firestore rules needing write access to invoices / invoice_counters / quote.convert field.
 *
 * @param {{ quoteId: string; userId: string }} _params userId unused; auth.uid is enforced server-side
 * @returns {Promise<string>} New invoice document id
 */
export async function createInvoiceFromQuote({ quoteId }) {
  const id = String(quoteId ?? "").trim();
  if (!id) throw new Error("quoteId is required");

  const fn = httpsCallable(getFunctionsInstance(), "convertQuoteToInvoice");
  try {
    const result = await fn({ quoteId: id });
    const invoiceId = result.data?.invoiceId;
    if (!invoiceId) throw new Error("Conversion failed");
    return invoiceId;
  } catch (e) {
    const code = e?.code;
    const msg = e?.message || String(e);
    if (code === "functions/not-found") throw new Error("Quote not found.");
    if (code === "functions/permission-denied") throw new Error("Not authorized");
    if (code === "functions/failed-precondition") {
      throw new Error(msg.replace(/^.*?:\s*/, "") || msg);
    }
    throw new Error(msg);
  }
}
