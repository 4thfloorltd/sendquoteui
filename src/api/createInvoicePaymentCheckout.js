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
 * Creates a Stripe Checkout Session (mode=payment) for an unpaid invoice. Callable is public (no auth).
 * Redirect the browser to the returned url.
 * @param {string} invoiceId Firestore invoice document id
 * @returns {Promise<{ url: string }>}
 */
export async function createInvoicePaymentCheckout(invoiceId) {
  const id = String(invoiceId ?? "").trim();
  if (!id) {
    throw new Error("invoiceId is required");
  }
  const fn = httpsCallable(getFunctionsInstance(), "createInvoicePaymentCheckout");
  const result = await fn({ invoiceId: id });
  const url = result.data?.url;
  if (!url || typeof url !== "string") {
    throw new Error("Could not start payment");
  }
  return { url };
}
