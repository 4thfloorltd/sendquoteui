/**
 * Address suggestions via Google Places API (New) only.
 * Biased with `includedRegionCodes` from language tags (+ UK timezone hint when language is only en-US).
 *
 * If you get 403 PERMISSION_DENIED, check in Google Cloud Console:
 * 1. Enable "Places API (New)" (APIs & Services → Library → search "Places API New").
 * 2. Billing must be enabled on the project.
 * 3. API key → Application restrictions: use "HTTP referrers" and include BOTH local dev
 *    patterns from Google’s docs (localhost and 127.0.0.1 with port wildcards), plus your
 *    production origins. (IP-restricted keys do not work from the browser.)
 * 4. API key → API restrictions: restrict to "Places API (New)" or use "Don't restrict"
 *    while testing until it works.
 *
 * Open DevTools → Network → failed `autocomplete` request → Response body for `error.message`.
 */

/** UK timezones when the browser language is only `en-US` but the machine is localised to GB */
const UK_TIMEZONES = new Set(["Europe/London", "Europe/Belfast"]);

function regionFromLanguageTag(tag) {
  if (!tag || typeof tag !== "string") return null;
  const normalized = tag.replace(/_/g, "-");
  try {
    const locale = new Intl.Locale(normalized);
    if (locale.region && /^[A-Za-z]{2}$/.test(locale.region)) {
      return locale.region.toUpperCase();
    }
  } catch {
    /* ignore */
  }
  const parts = normalized.split("-");
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && /^[A-Za-z]{2}$/.test(last)) {
    return last.toUpperCase();
  }
  return null;
}

/**
 * ISO 3166-1 alpha-2 from the browser - used to bias Places. Not GPS.
 * Uses `navigator.languages` (ordered) so `en-GB` ahead of `en-US` is respected;
 * if we only get `US` from language but the system timezone is UK, prefer GB.
 */
export function getUserCountryCode() {
  if (typeof navigator === "undefined") return "GB";

  const ordered =
    typeof navigator.languages !== "undefined" && navigator.languages?.length
      ? [...navigator.languages]
      : [navigator.language];

  let fromLang = null;
  for (const tag of ordered) {
    const code = regionFromLanguageTag(tag);
    if (code) {
      fromLang = code;
      break;
    }
  }

  if (fromLang === "US") {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && UK_TIMEZONES.has(tz)) return "GB";
    } catch {
      /* ignore */
    }
  }

  if (fromLang) return fromLang;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && UK_TIMEZONES.has(tz)) return "GB";
  } catch {
    /* ignore */
  }

  return "GB";
}

function regionDisplayName(regionCode) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(regionCode) || "";
  } catch {
    return "";
  }
}

async function searchGooglePlaces(query, apiKey, signal, regionCode) {
  const lang =
    typeof navigator !== "undefined" ? navigator.language.replace(/_/g, "-").slice(0, 10) : "en";

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input: query,
      languageCode: lang,
      includedRegionCodes: [regionCode],
    }),
  });

  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data?.error?.message ||
      data?.error?.status ||
      (!data && raw) ||
      `${res.status} ${res.statusText}`;
    console.warn(
      `[Places Autocomplete] ${res.status}. ${message}`,
      data?.error?.details ? data.error.details : "",
    );
    return [];
  }

  const suggestions = data?.suggestions || [];
  return suggestions
    .map((s, i) => {
      const p = s.placePrediction;
      if (!p) return null;
      const main = p.structuredFormat?.mainText?.text;
      const secondary = p.structuredFormat?.secondaryText?.text;
      const fromStructured = [main, secondary].filter(Boolean).join(", ");
      const label = (p.text?.text || fromStructured).trim();
      if (!label) return null;
      const placeId = p.placeId || p.place?.replace?.(/^places\//, "") || `g-${i}`;
      return {
        id: placeId,
        label,
        primary: (main || label).trim(),
        subtitle: (secondary || "").trim(),
      };
    })
    .filter(Boolean);
}

function normalizeSpaces(str) {
  return str.replace(/\s+/g, "").toLowerCase();
}

/**
 * Full single-line address after the user picks a suggestion (includes postcode when Google has it).
 * @param {string} placeId
 * @param {AbortSignal} [signal]
 * @returns {Promise<string | null>} null only when the request fails (caller can fall back to suggestion label)
 */
export async function fetchPlaceFormattedAddress(placeId, signal) {
  const googleKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY?.trim();
  if (!googleKey || !placeId) return null;

  const id = encodeURIComponent(placeId);
  const res = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
    method: "GET",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": googleKey,
      "X-Goog-FieldMask": "formattedAddress,addressComponents",
    },
  });

  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    console.warn(
      "[Place Details]",
      res.status,
      data?.error?.message || res.statusText,
    );
    return null;
  }

  let line = (data?.formattedAddress || "").trim();
  const components = data?.addressComponents || [];
  const postal = components.find((c) => c.types?.includes("postal_code"));
  const pc = (postal?.longText || postal?.shortText || "").trim();

  if (pc && line && !normalizeSpaces(line).includes(normalizeSpaces(pc))) {
    line = `${line}, ${pc}`;
  }
  if (!line && pc) line = pc;

  return line || null;
}

/**
 * @param {string} query
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ id: string, label: string, primary: string, subtitle: string }[]>}
 */
export async function searchAddresses(query, signal) {
  const q = query.trim();
  if (q.length < 3) return [];

  const googleKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY?.trim();
  if (!googleKey) return [];

  const regionCode = getUserCountryCode();
  try {
    return await searchGooglePlaces(q, googleKey, signal, regionCode);
  } catch (e) {
    console.warn("[Places Autocomplete] Request failed:", e);
    return [];
  }
}

/** Short hint for form helper text, e.g. "United Kingdom" */
export function getAddressSearchCountryHint() {
  const code = getUserCountryCode();
  const name = regionDisplayName(code);
  return name ? `${name} (${code})` : code;
}
