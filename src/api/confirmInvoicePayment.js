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
 * Verifies a succeeded Stripe PaymentIntent and marks the Firestore invoice paid.
 * @param {string} invoiceId
 * @param {string} paymentIntentId
 * @returns {Promise<{ status: string }>}
 */
export async function confirmInvoicePayment(invoiceId, paymentIntentId) {
  const id = String(invoiceId ?? "").trim();
  const pi = String(paymentIntentId ?? "").trim();
  if (!id) throw new Error("invoiceId is required");
  if (!pi) throw new Error("paymentIntentId is required");
  const fn = httpsCallable(getFunctionsInstance(), "confirmInvoicePayment");
  const result = await fn({ invoiceId: id, paymentIntentId: pi });
  return { status: result.data?.status ?? "paid" };
}
