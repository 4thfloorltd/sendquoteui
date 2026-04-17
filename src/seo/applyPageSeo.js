import { DEFAULT_OG_IMAGE_URL, SITE_NAME, SITE_URL } from "../constants/site";

const LD_JSON_ID = "sendquote-jsonld";

function metaByName(name) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  return el;
}

function metaByProperty(property) {
  let el = document.head.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  return el;
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(data) {
  let el = document.getElementById(LD_JSON_ID);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = LD_JSON_ID;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * @param {object} opts
 * @param {string} opts.title - full document title
 * @param {string} opts.description
 * @param {string} opts.path - pathname + search (e.g. /pricing)
 * @param {boolean} [opts.noindex]
 * @param {object|null} [opts.jsonLd] - single JSON-LD object or null to remove
 */
export function applyPageSeo({ title, description, path, noindex = false, jsonLd = null }) {
  if (typeof document === "undefined") return;

  document.title = title;

  metaByName("description").setAttribute("content", description);

  if (noindex) {
    metaByName("robots").setAttribute("content", "noindex, nofollow");
  } else {
    document.head.querySelector('meta[name="robots"]')?.remove();
  }

  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  setCanonical(url);

  metaByProperty("og:type").setAttribute("content", "website");
  metaByProperty("og:site_name").setAttribute("content", SITE_NAME);
  metaByProperty("og:title").setAttribute("content", title);
  metaByProperty("og:description").setAttribute("content", description);
  metaByProperty("og:url").setAttribute("content", url);
  metaByProperty("og:image").setAttribute("content", DEFAULT_OG_IMAGE_URL);
  metaByProperty("og:locale").setAttribute("content", "en_GB");

  metaByName("twitter:card").setAttribute("content", "summary_large_image");
  metaByName("twitter:title").setAttribute("content", title);
  metaByName("twitter:description").setAttribute("content", description);
  metaByName("twitter:image").setAttribute("content", DEFAULT_OG_IMAGE_URL);

  setJsonLd(jsonLd);
}

const DEFAULT_DESCRIPTION =
  "Create, send, and track professional quotes with AI-assisted drafting. Customers accept or decline online — no sign-in required. Free plan available; upgrade for unlimited quotes and PDF import.";

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      logo: `${SITE_URL}/favicon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export function resolveSeoForPath(pathname) {
  const path = pathname || "/";

  if (path.startsWith("/secured")) {
    return {
      title: `${SITE_NAME} — Account`,
      description: "Manage your SendQuote account, quotes, billing, and settings.",
      path,
      noindex: true,
      jsonLd: null,
    };
  }

  if (/^\/quote\/[^/]+$/.test(path)) {
    return {
      title: `Quote — ${SITE_NAME}`,
      description: "View and respond to a quote sent via SendQuote.",
      path,
      noindex: true,
      jsonLd: null,
    };
  }

  switch (path) {
    case "/":
      return {
        title: `${SITE_NAME} — Send quotes anywhere, anytime`,
        description: DEFAULT_DESCRIPTION,
        path: "/",
        noindex: false,
        jsonLd: ORG_JSON_LD,
      };
    case "/quote":
      return {
        title: `Create a quote — ${SITE_NAME}`,
        description:
          "Build a professional quote with line items, VAT, and AI-assisted descriptions. Share a secure link with your customer.",
        path: "/quote",
        noindex: false,
        jsonLd: null,
      };
    case "/pricing":
      return {
        title: `Pricing — ${SITE_NAME}`,
        description:
          "SendQuote pricing: start free with up to three quotes, or upgrade to Premium for unlimited quotes, PDF import, and priority support.",
        path: "/pricing",
        noindex: false,
        jsonLd: null,
      };
    case "/privacy":
      return {
        title: `Privacy Policy — ${SITE_NAME}`,
        description: "How SendQuote collects, uses, and stores your data.",
        path: "/privacy",
        noindex: false,
        jsonLd: null,
      };
    case "/terms":
      return {
        title: `Terms of Service — ${SITE_NAME}`,
        description: "Terms of Service for using SendQuote.",
        path: "/terms",
        noindex: false,
        jsonLd: null,
      };
    case "/register":
      return {
        title: `Create account — ${SITE_NAME}`,
        description: "Sign up for SendQuote to save quotes, track acceptances, and manage billing.",
        path: "/register",
        noindex: true,
        jsonLd: null,
      };
    case "/login":
      return {
        title: `Sign in — ${SITE_NAME}`,
        description: "Sign in to your SendQuote account.",
        path: "/login",
        noindex: true,
        jsonLd: null,
      };
    case "/forgot-password":
      return {
        title: `Forgot password — ${SITE_NAME}`,
        description: "Reset your SendQuote account password.",
        path: "/forgot-password",
        noindex: true,
        jsonLd: null,
      };
    case "/reset-password":
      return {
        title: `Reset password — ${SITE_NAME}`,
        description: "Choose a new password for your SendQuote account.",
        path: "/reset-password",
        noindex: true,
        jsonLd: null,
      };
    default:
      return {
        title: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        path,
        noindex: false,
        jsonLd: null,
      };
  }
}
