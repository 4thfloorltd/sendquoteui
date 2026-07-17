import { getDefaultVatPercent } from "../helpers/currency";

const LS_KEY = "sendquote_guest_tax_prefs";

export function parseDefaultVatPercentInput(raw) {
  const s = String(raw ?? "").trim().replace(",", ".");
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

/** @returns {{ vatRegistered: boolean, defaultVatPercent: number } | null} */
export function readGuestTaxPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    const vatRegistered = p?.vatRegistered !== false;
    const parsed = parseDefaultVatPercentInput(p?.defaultVatPercent);
    const defaultVatPercent = parsed ?? getDefaultVatPercent();
    return { vatRegistered, defaultVatPercent };
  } catch {
    return null;
  }
}

export function writeGuestTaxPrefs({ vatRegistered, defaultVatPercent }) {
  const v = parseDefaultVatPercentInput(defaultVatPercent);
  if (v === null) return;
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        vatRegistered: vatRegistered !== false,
        defaultVatPercent: v,
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearGuestTaxPrefs() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

/** Firestore user doc fields from guest session (quote builder before sign-in). */
export function guestTaxPrefsToProfileFields(prefs) {
  const p = prefs ?? readGuestTaxPrefs();
  if (!p) return null;
  return {
    vatRegistered: p.vatRegistered,
    defaultVatPercent: p.defaultVatPercent,
  };
}
