import { getVatForRegion } from "./vatRates";

const REGION_TO_CURRENCY = {
  GB: "GBP",
  GG: "GBP",
  JE: "GBP",
  IM: "GBP",
  US: "USD",
  AU: "AUD",
  NZ: "NZD",
  CA: "CAD",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  FI: "EUR",
  GR: "EUR",
  LU: "EUR",
  HU: "HUF",
  RO: "RON",
  TR: "TRY",
  SG: "SGD",
  BR: "BRL",
  CN: "CNY",
  CZ: "CZK",
  DK: "DKK",
  HK: "HKD",
  ID: "IDR",
  IL: "ILS",
  JP: "JPY",
  MY: "MYR",
  NO: "NOK",
  PH: "PHP",
  PL: "PLN",
  SE: "SEK",
};

/** ISO 3166-1 alpha-2 → regional-indicator flag emoji */
export const getFlagEmoji = (region) => {
  if (!region || region.length !== 2) return "";
  const upper = region.toUpperCase();
  try {
    return String.fromCodePoint(
      ...[...upper].map((c) => 127397 + c.charCodeAt(0)),
    );
  } catch {
    return "";
  }
};

// Coarse timezone-prefix → currency / VAT for when language tags lack a region.
const TIMEZONE_TO_CURRENCY = {
  "Europe/London": "GBP",
  "Europe/Jersey": "GBP",
  "Europe/Guernsey": "GBP",
  "Europe/Isle_of_Man": "GBP",
  "Pacific/Auckland": "NZD",
  "Pacific/Chatham": "NZD",
};
const TIMEZONE_PREFIX_TO_CURRENCY = {
  "Australia/": "AUD",
  "America/": "USD",
  "Pacific/": "NZD",
  // Broad European fallback — specific GBP entries above take priority via
  // exact-match check before this prefix scan runs.
  "Europe/": "EUR",
  "Atlantic/": "EUR",
};
// Coarse timezone → VAT fallback (used only when region can't be resolved from language).
const TIMEZONE_TO_VAT = {
  "Europe/London": 20,
  "Europe/Jersey": 20,
  "Europe/Guernsey": 20,
  "Europe/Isle_of_Man": 20,
  "Pacific/Auckland": 15,
  "Pacific/Chatham": 15,
};
const TIMEZONE_PREFIX_TO_VAT = {
  "Australia/": 10,
  "America/": 0,
  // Broad European fallback for when language detection has no region.
  // Specific GBP/VAT entries above are checked first via exact-match.
  "Europe/": 20, // most common EU standard rate; language detection handles per-country precision
  "Atlantic/": 20,
};

// ─── Shared region detection ──────────────────────────────────────────────────
const getRegion = () => {
  if (typeof Intl === "undefined") return null;
  const langs =
    typeof navigator !== "undefined" && navigator.languages?.length
      ? navigator.languages
      : typeof navigator !== "undefined" && navigator.language
      ? [navigator.language]
      : [];

  // Chrome on Windows defaults to "en-US" even for non-US users, so "US"
  // from a language tag is unreliable. Ignore it entirely and let the timezone
  // fallback handle genuine US users (America/* → USD / 0 % VAT).
  for (const lang of langs) {
    try {
      const region = new Intl.Locale(lang).region;
      if (region && region !== "US") return region;
    } catch { /* ignore */ }
  }
  return null;
};

export const getDefaultCurrency = () => {
  const region = getRegion();
  if (region && REGION_TO_CURRENCY[region]) return REGION_TO_CURRENCY[region];

  // Fall back to OS timezone.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (TIMEZONE_TO_CURRENCY[tz]) return TIMEZONE_TO_CURRENCY[tz];
      for (const [prefix, code] of Object.entries(TIMEZONE_PREFIX_TO_CURRENCY)) {
        if (tz.startsWith(prefix)) return code;
      }
    }
  } catch { /* ignore */ }

  return "GBP";
};

/**
 * Marketing display amount for Premium / month. Stripe may charge a different currency;
 * the UI shows this number with the visitor’s default currency symbol.
 */
export const PREMIUM_MONTHLY_DISPLAY_AMOUNT = 9.99;

export function formatPremiumMonthlyDisplay(currency = getDefaultCurrency()) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(PREMIUM_MONTHLY_DISPLAY_AMOUNT);
}

export function formatFreePlanPriceDisplay(currency = getDefaultCurrency()) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(0);
}

/** Narrow symbol for a currency code (e.g. £, $, €) — use for UI examples and hints. */
export const getCurrencyNarrowSymbol = (code) => {
  if (!code || typeof code !== "string") return "";
  try {
    const part = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code.toUpperCase(),
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part?.value ?? "";
  } catch {
    return "";
  }
};

/** Returns the standard VAT / GST rate (0–100) for the user's detected region.
 *  Uses live EU rates from vatcomply.com if initVatRates() has already resolved,
 *  otherwise falls back to the hardcoded map in vatRates.js. */
export const getDefaultVatPercent = () => {
  const region = getRegion();
  if (region) {
    const rate = getVatForRegion(region);
    if (rate !== null) return rate;
  }

  // Fall back to OS timezone.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (Object.prototype.hasOwnProperty.call(TIMEZONE_TO_VAT, tz)) return TIMEZONE_TO_VAT[tz];
      for (const [prefix, rate] of Object.entries(TIMEZONE_PREFIX_TO_VAT)) {
        if (tz.startsWith(prefix)) return rate;
      }
    }
  } catch { /* ignore */ }

   return 20;
};

/**
 * VAT % for new line items when a user has saved `defaultVatPercent` on their
 * profile; otherwise {@link getDefaultVatPercent} (region-based).
 * @param {object|null|undefined} profile - Firestore `users` doc or `{ defaultVatPercent }`
 */
export function resolveDefaultVatPercent(profile) {
  const raw = profile?.defaultVatPercent;
  if (raw !== undefined && raw !== null) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 100) {
      return Math.round(n * 100) / 100;
    }
  }
  return getDefaultVatPercent();
}

/** Shown first in the picker; also listed again under “All”. */
export const POPULAR_CURRENCY_CODES = ["GBP", "USD", "EUR"];

/**
 * Supported quote currencies (order: primary set, then others)
 */
export const CURRENCY_OPTIONS = [
  { code: "USD", label: "USD — US Dollar", region: "US" },
  { code: "GBP", label: "GBP — British Pound", region: "GB" },
  { code: "EUR", label: "EUR — Euro", region: "EU" },
  { code: "AUD", label: "AUD — Australian Dollar", region: "AU" },
  { code: "NZD", label: "NZD — New Zealand Dollar", region: "NZ" },
  { code: "CAD", label: "CAD — Canadian Dollar", region: "CA" },
  { code: "HUF", label: "HUF — Hungarian Forint", region: "HU" },
  { code: "RON", label: "RON — Romanian Leu", region: "RO" },
  { code: "TRY", label: "TRY — Turkish Lira", region: "TR" },
  { code: "SGD", label: "SGD — Singapore Dollar", region: "SG" },
  { code: "BRL", label: "BRL — Brazilian Real", region: "BR" },
  { code: "CNY", label: "CNY — Chinese Yuan", region: "CN" },
  { code: "CZK", label: "CZK — Czech Koruna", region: "CZ" },
  { code: "DKK", label: "DKK — Danish Krone", region: "DK" },
  { code: "HKD", label: "HKD — Hong Kong Dollar", region: "HK" },
  { code: "IDR", label: "IDR — Indonesian Rupiah", region: "ID" },
  { code: "ILS", label: "ILS — Israeli Shekel", region: "IL" },
  { code: "JPY", label: "JPY — Japanese Yen", region: "JP" },
  { code: "MYR", label: "MYR — Malaysian Ringgit", region: "MY" },
  { code: "NOK", label: "NOK — Norwegian Krone", region: "NO" },
  { code: "PHP", label: "PHP — Philippine Peso", region: "PH" },
  { code: "PLN", label: "PLN — Polish Zloty", region: "PL" },
  { code: "SEK", label: "SEK — Swedish Krona", region: "SE" },
];

export const POPULAR_CURRENCY_OPTIONS = POPULAR_CURRENCY_CODES.map((code) =>
  CURRENCY_OPTIONS.find((o) => o.code === code),
).filter(Boolean);
