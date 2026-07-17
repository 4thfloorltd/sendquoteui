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
 * Emails the public invoice link to the customer (uses invoice.customerEmail in Firestore).
 * @param {string} invoiceId
 * @param {{ resend?: boolean }} [options]
 * @returns {Promise<{ ok?: boolean, sent?: boolean, skipped?: boolean, reason?: string, isRevision?: boolean }>}
 */
export async function sendInvoiceLinkToCustomer(invoiceId, options = {}) {
  const id = String(invoiceId ?? "").trim();
  if (!id) {
    throw new Error("invoiceId is required");
  }
  const fn = httpsCallable(getFunctionsInstance(), "sendInvoiceLinkToCustomer");
  const result = await fn({ invoiceId: id, resend: Boolean(options.resend) });
  return result.data;
}
