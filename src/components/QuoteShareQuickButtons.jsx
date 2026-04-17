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
 * WhatsApp / Messenger / Email quick actions for a public quote link.
 * @param {{ quoteDocId: string | null | undefined; sx?: object }} props
 */
export default function QuoteShareQuickButtons({ quoteDocId, sx }) {
  if (!quoteDocId) return null;
  const quoteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/quote/${quoteDocId}`;
  const shareText = `Here is your quote: ${quoteUrl}`;
  const mailto = `mailto:?subject=${encodeURIComponent("Your quote is ready")}&body=${encodeURIComponent(shareText)}`;

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
