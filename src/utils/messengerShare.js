/**
 * Open a share flow for the quote URL. Prefer the system share sheet when
 * available; otherwise use Meta's Messenger deep link on mobile, and Facebook's
 * web sharer on desktop (fb-messenger:// does not work in desktop browsers).
 *
 * @param {string} url - full public quote URL
 * @returns {Promise<void>}
 */
export async function openMessengerShare(url) {
  if (!url) return;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ url, title: "Your quote" });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
      // User agent may support share API but reject; fall through
    }
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent ?? "" : "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  if (isMobile) {
    // Scheme must be `fb-messenger://share?link=` (no slash before `?`).
    window.location.assign(`fb-messenger://share?link=${encodeURIComponent(url)}`);
    return;
  }

  const w = window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    "_blank",
    "noopener,noreferrer",
  );
  if (w) w.opener = null;
}
