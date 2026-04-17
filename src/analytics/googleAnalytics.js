import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { app } from "../../firebase";

let analytics = null;
let initPromise = null;

/**
 * Initialise GA4 (Firebase Analytics) once. Resolves null if unsupported or misconfigured.
 */
export function ensureGoogleAnalytics() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) return Promise.resolve(null);
  if (analytics) return Promise.resolve(analytics);
  if (!initPromise) {
    initPromise = (async () => {
      try {
        if (!(await isSupported())) {
          if (import.meta.env.DEV) {
            console.info("Firebase Analytics: not supported in this environment (e.g. private browsing).");
          }
          return null;
        }
        analytics = getAnalytics(app);
        return analytics;
      } catch (e) {
        console.warn("Google Analytics (Firebase) could not start:", e?.message ?? e);
        return null;
      }
    })();
  }
  return initPromise;
}

/** SPA page views — call on route changes (after ensureGoogleAnalytics has resolved). */
export async function trackGa4PageView(pathname, search = "") {
  const a = await ensureGoogleAnalytics();
  if (!a) return;
  const pagePath = `${pathname}${search || ""}`;
  logEvent(a, "page_view", {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_title: document.title,
  });
}
