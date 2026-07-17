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
 * Creates a Stripe PaymentIntent for embedded Elements checkout (public callable, no auth).
 * @param {string} invoiceId Firestore invoice document id
 * @returns {Promise<{ clientSecret: string }>}
 */
export async function createInvoicePaymentIntent(invoiceId) {
  const id = String(invoiceId ?? "").trim();
  if (!id) {
    throw new Error("invoiceId is required");
  }
  const fn = httpsCallable(getFunctionsInstance(), "createInvoicePaymentIntent");
  const result = await fn({ invoiceId: id });
  const clientSecret = result.data?.clientSecret;
  if (!clientSecret || typeof clientSecret !== "string") {
    throw new Error("Could not start payment");
  }
  return { clientSecret };
}
