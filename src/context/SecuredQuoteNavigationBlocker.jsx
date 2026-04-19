import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { useBlocker } from "react-router-dom";

const SecuredQuoteNavigationBlockerContext = createContext(null);

/**
 * Single useBlocker for the app (React Router allows only one at a time).
 * QuoteGenerator registers its should-block predicate via registerShouldBlock.
 * Avoids Strict Mode double-mount registering two blockers.
 */
export function SecuredQuoteNavigationBlockerProvider({ children }) {
  const shouldBlockRef = useRef(() => false);

  const registerShouldBlock = useCallback((fn) => {
    shouldBlockRef.current = typeof fn === "function" ? fn : () => false;
  }, []);

  const blocker = useBlocker((args) => shouldBlockRef.current(args));

  const value = useMemo(
    () => ({ registerShouldBlock, blocker }),
    [registerShouldBlock, blocker],
  );

  return (
    <SecuredQuoteNavigationBlockerContext.Provider value={value}>
      {children}
    </SecuredQuoteNavigationBlockerContext.Provider>
  );
}

export function useSecuredQuoteNavigationBlocker() {
  const ctx = useContext(SecuredQuoteNavigationBlockerContext);
  if (!ctx) {
    throw new Error(
      "useSecuredQuoteNavigationBlocker must be used within SecuredQuoteNavigationBlockerProvider",
    );
  }
  return ctx;
}
