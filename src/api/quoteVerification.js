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

export async function sendQuoteVerificationCode(email) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email is required");
  }
  const fn = httpsCallable(getFunctionsInstance(), "sendQuoteVerificationCode");
  const result = await fn({ email: normalizedEmail });
  return result.data;
}

export async function verifyQuoteVerificationCode({ challengeId, email, code }) {
  const fn = httpsCallable(getFunctionsInstance(), "verifyQuoteVerificationCode");
  const result = await fn({
    challengeId: String(challengeId ?? "").trim(),
    email: String(email ?? "").trim().toLowerCase(),
    code: String(code ?? "").trim(),
  });
  return result.data;
}
