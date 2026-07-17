import { Box, IconButton, Tooltip } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp, faFacebookMessenger } from "@fortawesome/free-brands-svg-icons";
import { openMessengerShare } from "../utils/messengerShare";

const iconBtnSx = {
  borderRadius: 1.5,
  width: 40,
  height: 40,
  color: "#fff",
};

const iconSx = { fontSize: 22 };

/**
 * @param {object} p
 * @param {string} p.quoteUrl
 * @param {string} [p.customerName]
 * @param {string} [p.businessName]
 * @param {string} [p.quoteNumber] Raw digits (e.g. "0001") - shown as QU-0001.
 * @param {string} [p.currency] ISO code (e.g. "GBP").
 * @param {number} [p.total] Quote total for the amount line.
 */
function buildQuoteShareMessage({
  quoteUrl,
  customerName,
  businessName,
  quoteNumber,
  currency,
  total,
  documentKind = "quote",
}) {
  const name = (customerName ?? "").trim();
  const greeting = name ? `Hi ${name},` : "Hi,";
  const biz = (businessName ?? "").trim();
  const cur = ((currency ?? "GBP").trim() || "GBP").toUpperCase();
  const totalNum = Number(total);
  const amountLine = Number.isFinite(totalNum) ? `${cur} ${totalNum.toFixed(2)}` : null;
  const num = (quoteNumber ?? "").trim();
  const isInv = documentKind === "invoice";
  const docRef = num ? (isInv ? `INV-${num}` : `QU-${num}`) : null;

  let docSentence;
  if (isInv) {
    if (docRef && amountLine) {
      docSentence = `Here's invoice ${docRef} for ${amountLine}.`;
    } else if (docRef) {
      docSentence = `Here's invoice ${docRef}.`;
    } else if (amountLine) {
      docSentence = `Here's your invoice for ${amountLine}.`;
    } else {
      docSentence = "Here's your invoice.";
    }
  } else if (docRef && amountLine) {
    docSentence = `Here's quote ${docRef} for ${amountLine}.`;
  } else if (docRef) {
    docSentence = `Here's quote ${docRef}.`;
  } else if (amountLine) {
    docSentence = `Here's your quote for ${amountLine}.`;
  } else {
    docSentence = "Here's your quote.";
  }

  const viewLine = isInv ? `View your invoice online: ${quoteUrl}` : `View your quote online: ${quoteUrl}`;
  const footerLine = isInv
    ? "You can view, download, or print this invoice from the link."
    : "From your online quote you can accept, decline, comment or print.";

  const lines = [
    greeting,
    "",
    isInv ? "Thank you for your business." : "Thank you for your enquiry.",
    "",
    docSentence,
    "",
    viewLine,
    "",
    footerLine,
    "",
    "If you have any questions, please let us know.",
    "",
    "Thanks,",
  ];
  if (biz) lines.push(biz);
  return lines.join("\n");
}

/**
 * WhatsApp / Messenger / Email quick actions for a public quote link.
 * @param {{
 *   quoteDocId: string | null | undefined;
 *   customerName?: string | null;
 *   businessName?: string | null;
 *   quoteNumber?: string | null;
 *   currency?: string | null;
 *   total?: number | null;
 *   sx?: object;
 * }} props
 */
export default function QuoteShareQuickButtons({
  quoteDocId,
  customerName,
  businessName,
  quoteNumber,
  currency,
  total,
  documentKind = "quote",
  sx,
}) {
  if (!quoteDocId) return null;
  const pathSeg = documentKind === "invoice" ? "invoice" : "quote";
  const quoteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${pathSeg}/${quoteDocId}`;
  const shareText = buildQuoteShareMessage({
    quoteUrl,
    customerName,
    businessName,
    quoteNumber,
    currency,
    total,
    documentKind,
  });
  const num = (quoteNumber ?? "").trim();
  const subject =
    documentKind === "invoice"
      ? (num ? `Invoice INV-${num} - ready to view` : "Your invoice is ready")
      : (num ? `Quote QU-${num} - ready to view` : "Your quote is ready");
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText)}`;

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", ...sx }}>
      <Tooltip title="Share via WhatsApp" arrow>
        <IconButton
          component="a"
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ ...iconBtnSx, bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe5d" } }}
          aria-label="Share via WhatsApp"
        >
          <FontAwesomeIcon icon={faWhatsapp} style={iconSx} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Share via Messenger (or Facebook in browser)" arrow>
        <IconButton
          type="button"
          onClick={() => openMessengerShare(quoteUrl)}
          sx={{ ...iconBtnSx, bgcolor: "#0084FF", "&:hover": { bgcolor: "#006fd4" } }}
          aria-label="Share via Messenger or Facebook"
        >
          <FontAwesomeIcon icon={faFacebookMessenger} style={iconSx} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Share via Email" arrow>
        <IconButton
          component="a"
          href={mailto}
          sx={{ ...iconBtnSx, bgcolor: "#EA4335", "&:hover": { bgcolor: "#c9342a" } }}
          aria-label="Share via Email"
        >
          <FontAwesomeIcon icon={faEnvelope} style={iconSx} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
