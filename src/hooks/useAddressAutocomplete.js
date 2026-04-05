import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPlaceFormattedAddress, searchAddresses } from "../helpers/addressSearch";

const DEBOUNCE_MS = 320;

export function useAddressAutocomplete() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const timerRef = useRef(null);
  const searchAbortRef = useRef(null);
  const detailAbortRef = useRef(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      searchAbortRef.current?.abort();
      detailAbortRef.current?.abort();
    },
    [],
  );

  const clearOptions = useCallback(() => setOptions([]), []);

  const scheduleSearch = useCallback((text) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const q = text.trim();
      if (q.length < 3) {
        setOptions([]);
        setLoading(false);
        return;
      }
      searchAbortRef.current?.abort();
      const ac = new AbortController();
      searchAbortRef.current = ac;
      setLoading(true);
      try {
        setOptions(await searchAddresses(q, ac.signal));
      } catch (e) {
        if (e.name !== "AbortError") setOptions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  /** Resolves a chosen place to a full formatted line, or a free-typed string as-is. */
  const finalizeSelection = useCallback(async (option) => {
    if (option == null) return "";
    if (typeof option === "string") return option;
    detailAbortRef.current?.abort();
    const ac = new AbortController();
    detailAbortRef.current = ac;
    setResolving(true);
    try {
      const formatted = await fetchPlaceFormattedAddress(option.id, ac.signal);
      if (ac.signal.aborted) return null;
      const line = (formatted?.trim() || option.label || "").trim();
      return line;
    } catch (e) {
      if (e.name === "AbortError" || ac.signal.aborted) return null;
      return (option.label || "").trim();
    } finally {
      setResolving(false);
    }
  }, []);

  return {
    options,
    loading,
    resolving,
    scheduleSearch,
    clearOptions,
    finalizeSelection,
  };
}
