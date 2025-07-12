import React from "react";
import { Modal, Box, IconButton, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const NotificationModal = ({
  open,
  handleClose,
  modalPosition = {},
  latestQuotes = [],
  groupedNotifications = {},
}) => {
  // Group notifications by timeLabel (same logic as Dashboard)
  const grouped =
    Object.keys(groupedNotifications).length > 0
      ? groupedNotifications
      : latestQuotes.reduce((acc, quote) => {
          if (quote.status === "Accepted" || quote.status === "Declined") {
            const currentDate = new Date();
            const quoteDate = new Date(quote.dateSent);
            const timeDifference = Math.floor(
              (currentDate - quoteDate) / (1000 * 60 * 60 * 24)
            );

            let timeLabel;
            if (timeDifference === 0) {
              timeLabel = "Today";
            } else if (timeDifference === 1) {
              timeLabel = "Yesterday";
            } else {
              timeLabel = `${timeDifference} Days Ago`;
            }

            if (!acc[timeLabel]) {
              acc[timeLabel] = [];
            }
            acc[timeLabel].push(
              `<strong>${
                quote.name
              }</strong> has <strong>${quote.status.toLowerCase()}</strong> your quote: <strong>${
                quote.quoteId
              }</strong>`
            );
          }
          return acc;
        }, {});

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: "absolute",
          top: {
            xs: "10%",
            sm: modalPosition.top || "10%",
          },
          right: {
            xs: "2%",
            sm: "16px",
          },
          transform: {
            xs: "none",
            sm: "none",
          },
          bgcolor: "background.paper",
          borderRadius: "16px",
          boxShadow: 24,
          p: 2,
          width: {
            xs: "90%",
            sm: "400px",
          },
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "#555",
            width: "32px",
            height: "32px",
          }}
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faTimes} />
        </IconButton>

        {/* Modal Title */}
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", mb: 4, textAlign: "left" }}
        >
          Notifications{" "}
          <Typography
            component="span"
            sx={{ fontSize: "16px", fontWeight: "normal", color: "#555" }}
          >
            (
            {
              latestQuotes.filter(
                (quote) =>
                  quote.status === "Accepted" || quote.status === "Declined"
              ).length
            }
            )
          </Typography>
        </Typography>

        {/* Notifications Content */}
        {Object.entries(grouped).map(([timeLabel, messages], index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontWeight: "bold",
                fontSize: "14px",
                color: "#083a6b",
                mb: 2,
              }}
            >
              {timeLabel}
            </Typography>
            {messages.map((message, idx) => (
              <Box
                key={idx}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "#f9f9f9",
                  },
                  borderBottom:
                    idx !== messages.length - 1 ? "1px solid #eee" : "none",
                  mb: idx !== messages.length - 1 ? 1 : 0,
                  pb: idx !== messages.length - 1 ? 1 : 0,
                }}
                onClick={() => {
                  console.log(`Message clicked: ${message}`);
                }}
              >
                <Typography
                  sx={{
                    fontSize: "14px",
                    color: "#555",
                  }}
                  dangerouslySetInnerHTML={{ __html: message }}
                ></Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Modal>
  );
};

export default NotificationModal;
