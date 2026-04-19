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
 * Emails the public quote link to the customer (uses quote.customerEmail in Firestore).
 * Callable verifies the signed-in user owns the quote. Idempotent via customerInviteSentAt
 * unless `resend` is true (e.g. after saving quote edits).
 * @param {string} quoteId
 * @param {{ resend?: boolean }} [options]
 * @returns {Promise<{ ok?: boolean, sent?: boolean, skipped?: boolean, reason?: string, isRevision?: boolean }>}
 */
export async function sendQuoteLinkToCustomer(quoteId, options = {}) {
  const id = String(quoteId ?? "").trim();
  if (!id) {
    throw new Error("quoteId is required");
  }
  const fn = httpsCallable(getFunctionsInstance(), "sendQuoteLinkToCustomer");
  const result = await fn({ quoteId: id, resend: Boolean(options.resend) });
  return result.data;
}
