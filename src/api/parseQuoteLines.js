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

export async function parseQuoteLinesWithAi(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    throw new Error("No text to parse");
  }
  const fn = httpsCallable(getFunctionsInstance(), "parseQuoteLines");
  const result = await fn({ text: trimmed });
  return result.data;
}
