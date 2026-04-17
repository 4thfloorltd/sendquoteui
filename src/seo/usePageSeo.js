import { useEffect } from "react";
import { applyPageSeo, resolveSeoForPath } from "./applyPageSeo";

/** Updates document title, meta tags, canonical, and JSON-LD from the current path. */
export function usePageSeo(pathname) {
  useEffect(() => {
    const config = resolveSeoForPath(pathname);
    applyPageSeo(config);
  }, [pathname]);
}
