import { useEffect } from "react";
import { ensureGoogleAnalytics, trackGa4PageView } from "./googleAnalytics";

/**
 * Enables GA4 via Firebase Analytics and sends a page_view on each navigation.
 * Uses VITE_FIREBASE_MEASUREMENT_ID (same GA4 stream as the Firebase console).
 */
export function useGoogleAnalytics(location) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureGoogleAnalytics();
      if (cancelled) return;
      await trackGa4PageView(location.pathname, location.search);
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);
}
