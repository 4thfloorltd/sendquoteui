import { Box, Menu, MenuItem, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoice, faPaperPlane } from "@fortawesome/free-solid-svg-icons";

const ICON_WRAP = {
  width: 40,
  height: 40,
  borderRadius: 2,
  bgcolor: "#F0F4F8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

/**
 * Secured app: choose new quote vs new invoice. Parent owns anchorEl / quota / navigation.
 */
export default function CreateDocumentMenu({
  anchorEl,
  onClose,
  onQuote,
  onInvoice,
  anchorOrigin,
  transformOrigin,
  disableScrollLock = false,
}) {
  const open = Boolean(anchorEl);

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={anchorOrigin ?? { vertical: "bottom", horizontal: "right" }}
      transformOrigin={transformOrigin ?? { vertical: "top", horizontal: "right" }}
      disableScrollLock={disableScrollLock}
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            borderRadius: 2.5,
            minWidth: { xs: "min(320px, calc(100vw - 32px))", sm: 288 },
            maxWidth: 340,
            mt: { xs: 0.5, sm: 1 },
            overflow: "visible",
            border: "1px solid",
            borderColor: "rgba(8, 58, 107, 0.12)",
            boxShadow: "0 12px 40px rgba(8, 58, 107, 0.14), 0 4px 12px rgba(0, 0, 0, 0.06)",
          },
        },
      }}
      MenuListProps={{
        autoFocusItem: open,
        sx: { py: 1, px: 1, "& .MuiMenuItem-root": { whiteSpace: "normal" } },
      }}
    >
      <Box sx={{ px: 2, pt: 0.5, pb: 0.75 }}>
        <Typography
          component="div"
          sx={{
            fontSize: "0.65rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: "#64748B",
            textTransform: "uppercase",
          }}
        >
          Create new
        </Typography>
      </Box>
      <MenuItem
        onClick={(e) => {
          e.stopPropagation();
          onQuote?.();
        }}
        sx={{
          borderRadius: 2,
          py: 1.15,
          px: 1.25,
          gap: 1.25,
          mb: 0.25,
          alignItems: "flex-start",
          transition: "background-color 0.15s ease",
          "&:hover": { bgcolor: "rgba(8, 58, 107, 0.06)" },
        }}
      >
        <Box sx={ICON_WRAP} aria-hidden>
          <FontAwesomeIcon icon={faPaperPlane} style={{ color: "#083a6b", fontSize: 16 }} />
        </Box>
        <Box sx={{ minWidth: 0, pt: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A", lineHeight: 1.25 }}>
            Quote
          </Typography>
          <Typography variant="caption" sx={{ display: "block", color: "#64748B", lineHeight: 1.35, mt: 0.25 }}>
            Estimate or proposal
          </Typography>
        </Box>
      </MenuItem>
      <MenuItem
        onClick={(e) => {
          e.stopPropagation();
          onInvoice?.();
        }}
        sx={{
          borderRadius: 2,
          py: 1.15,
          px: 1.25,
          gap: 1.25,
          alignItems: "flex-start",
          transition: "background-color 0.15s ease",
          "&:hover": { bgcolor: "rgba(8, 58, 107, 0.06)" },
        }}
      >
        <Box sx={ICON_WRAP} aria-hidden>
          <FontAwesomeIcon icon={faFileInvoice} style={{ color: "#083a6b", fontSize: 16 }} />
        </Box>
        <Box sx={{ minWidth: 0, pt: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A", lineHeight: 1.25 }}>
            Invoice
          </Typography>
          <Typography variant="caption" sx={{ display: "block", color: "#64748B", lineHeight: 1.35, mt: 0.25 }}>
            Bill a customer
          </Typography>
        </Box>
      </MenuItem>
    </Menu>
  );
}
