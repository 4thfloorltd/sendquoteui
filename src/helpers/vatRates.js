/**
 * VAT rate resolution with a live EU data overlay.
 *
 * - `initVatRates()` — call once on app load; fetches current EU standard rates
 *   from vatcomply.com (free, open-source).  Silently falls back to the hardcoded
 *   map if the request fails or times out.
 * - `getVatForRegion(region)` — synchronous; returns the standard rate for an
 *   ISO 3166-1 alpha-2 region code, or null if unknown.
 *
 * Coverage:
 *   Fetched  → all current EU member states (always up to date)
 *   Hardcoded → UK, US, AU, NZ, SG, CA, JP, and other non-EU countries
 *   (non-EU rates change rarely and are safe to hardcode)
 */

const VATCOMPLY_URL = "https://api.vatcomply.com/vat_rates";
const FETCH_TIMEOUT_MS = 5_000;

// Hardcoded rates for non-EU countries (and EU fallback if the fetch fails).
const HARDCODED_RATES = {
  GB: 20, GG: 20, JE: 20, IM: 20,
  IE: 23,
  DE: 19, FR: 20, ES: 21, IT: 22, NL: 21, BE: 21,
  AT: 20, PT: 23, FI: 25, GR: 24, LU: 17,
  HU: 27, RO: 19, PL: 23, CZ: 21,
  DK: 25, NO: 25, SE: 25,
  AU: 10,
  NZ: 15,
  SG: 9,
  CA: 5,
  US: 0,
  HK: 0,
  JP: 10,
  CN: 13,
  TR: 20,
  IL: 18,
  ID: 11,
  MY: 8,
  PH: 12,
  BR: 0,
};

// In-memory overlay — populated by initVatRates(), keyed by region code.
let liveRates = null;

/**
 * Fetches the latest EU VAT standard rates from vatcomply.com and caches them.
 * Safe to call multiple times — only fetches once per page load.
 */
export async function initVatRates() {
  if (liveRates !== null) return; // already fetched

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(VATCOMPLY_URL, { signal: controller.signal });
    if (!res.ok) return;
    // Response is an array: [{country_code, standard_rate, ...}, ...]
    const data = await res.json();
    const fetched = {};
    for (const entry of Array.isArray(data) ? data : []) {
      if (entry?.country_code && typeof entry.standard_rate === "number") {
        fetched[entry.country_code] = entry.standard_rate;
      }
    }
    if (Object.keys(fetched).length > 0) {
      liveRates = fetched;
    }
  } catch {
    // Network error or timeout — silent fallback to hardcoded map.
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns the standard VAT/GST rate (0–100) for the given region code.
 * Live fetched rates take precedence over hardcoded ones for EU countries.
 * Returns null if the region is completely unknown.
 */
export function getVatForRegion(region) {
  if (!region) return null;
  if (liveRates && Object.prototype.hasOwnProperty.call(liveRates, region)) {
    return liveRates[region];
  }
  if (Object.prototype.hasOwnProperty.call(HARDCODED_RATES, region)) {
    return HARDCODED_RATES[region];
  }
  return null;
}
