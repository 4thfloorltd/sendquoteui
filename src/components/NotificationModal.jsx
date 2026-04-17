import { useNavigate } from "react-router-dom";
import { Box, Chip, Divider, IconButton, Paper, Popover, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const ordinal = (n) => {
  const v = n % 100;
  return n + (["th", "st", "nd", "rd"][(v - 20) % 10] || ["th", "st", "nd", "rd"][v] || "th");
};

const getNotifDateLabel = (date) => {
  const d = new Date(date);
  if (isNaN(d)) return "Earlier";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day   = new Date(d); day.setHours(0, 0, 0, 0);
  const diff  = Math.round((today - day) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 3)  return `${diff} days ago`;
  return `${ordinal(d.getDate())} ${d.toLocaleString("default", { month: "long" })} ${d.getFullYear()}`;
};

const normalizeItem = (item) => {
  if (typeof item === "string") return { message: item, quoteDocId: null, status: null, unread: false };
  if (item && typeof item.message === "string") {
    return {
      message:    item.message    ?? "",
      quoteDocId: item.quoteDocId ?? null,
      status:     item.status     ?? null,
      unread:     item.unread     ?? false,
    };
  }
  return { message: "", quoteDocId: null, status: null, unread: false };
};

const StatusIcon = ({ status }) => {
  if (status === "accepted") return <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "#22C55E", flexShrink: 0, mt: "1px" }} />;
  if (status === "declined") return <CancelOutlinedIcon    sx={{ fontSize: 18, color: "#EF4444", flexShrink: 0, mt: "1px" }} />;
  return null;
};

const NotificationModal = ({
  open,
  anchorEl,
  handleClose,
  latestQuotes = [],
  groupedNotifications = {},
  onNotificationClick,
}) => {
  const navigate = useNavigate();

  const grouped =
    Object.keys(groupedNotifications).length > 0
      ? groupedNotifications
      : latestQuotes.reduce((acc, quote) => {
          if (quote.status === "Accepted" || quote.status === "Declined") {
          const label = getNotifDateLabel(quote.dateSent);
            if (!acc[label]) acc[label] = [];
            acc[label].push({
              message: `<strong>${quote.name}</strong> has <strong>${quote.status.toLowerCase()}</strong> your quote <strong>${quote.quoteId}</strong>`,
              quoteDocId: quote.quoteDocId,
              status: quote.status.toLowerCase(),
              unread: false,
            });
          }
          return acc;
        }, {});

  const allItems = Object.values(grouped).flat().map(normalizeItem);
  const unreadCount = allItems.filter((i) => i.unread).length;
  const isEmpty = allItems.length === 0;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      disableScrollLock
      PaperProps={{
        elevation: 0,
        sx: {
          mt: 1,
          width: { xs: "calc(100vw - 16px)", sm: 360 },
          maxHeight: 480,
          borderRadius: 2,
          border: "1px solid #E2E8F0",
          boxShadow: "0 8px 32px rgba(15,23,42,0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5, borderBottom: "1px solid #E2E8F0", bgcolor: "#fff", flexShrink: 0 }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography variant="subtitle1" fontWeight={700} color="#083a6b">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} new`}
              size="small"
              sx={{ bgcolor: "#EFF6FF", color: "#083a6b", fontWeight: 700, fontSize: "0.68rem", height: 18, "& .MuiChip-label": { px: 0.75 } }}
            />
          )}
        </Stack>
        <IconButton size="small" onClick={handleClose} aria-label="Close notifications">
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>

      {/* Body */}
      <Box sx={{ overflowY: "auto", flex: 1, bgcolor: "#F8FAFC" }}>
        {isEmpty ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 5, px: 3, color: "#94A3B8" }} gap={1}>
            <NotificationsNoneIcon sx={{ fontSize: 36, opacity: 0.45 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center" fontSize="0.8rem">
              No notifications yet. You'll be alerted here when a customer responds to a quote.
            </Typography>
          </Stack>
        ) : (
          Object.entries(grouped).map(([label, messages], groupIdx) => (
            <Box key={groupIdx}>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  px: 2,
                  pt: groupIdx === 0 ? 1.5 : 1,
                  pb: 0.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#94A3B8",
                  fontSize: "0.65rem",
                }}
              >
                {label}
              </Typography>

              {messages.map((raw, idx) => {
                const { message, quoteDocId, status, unread } = normalizeItem(raw);
                return (
                  <Box key={idx}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      gap={1.25}
                      onClick={() => {
                        if (quoteDocId) {
                          onNotificationClick?.(quoteDocId, status);
                          handleClose();
                          navigate(`/secured/quote/${quoteDocId}`);
                        }
                      }}
                      sx={{
                        px: 2,
                        height: 56,
                        cursor: quoteDocId ? "pointer" : "default",
                        bgcolor: unread ? "#EBF3FF" : "#F8FAFC",
                        "&:hover": quoteDocId ? { bgcolor: "#DBEAFE" } : undefined,
                        transition: "background 0.12s",
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      {unread && (
                        <Box sx={{
                          position: "absolute",
                          left: 6,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          bgcolor: "#083a6b",
                        }} />
                      )}

                      <StatusIcon status={status} />

                      <Typography
                        variant="body2"
                        sx={{
                          color: "#374151",
                          lineHeight: 1.4,
                          flex: 1,
                          fontSize: "0.82rem",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                        dangerouslySetInnerHTML={{ __html: message }}
                      />

                      {quoteDocId && (
                        <ChevronRightIcon sx={{ fontSize: 15, color: "#94A3B8", flexShrink: 0 }} />
                      )}
                    </Stack>
                    {idx < messages.length - 1 && <Divider />}
                  </Box>
                );
              })}

              {groupIdx < Object.keys(grouped).length - 1 && <Divider sx={{ mt: 0.5 }} />}
            </Box>
          ))
        )}
      </Box>
    </Popover>
  );
};

export default NotificationModal;
