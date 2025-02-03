import React from "react";
import {
  Button,
  Divider,
  TextField,
  Box,
  Typography,
  Modal,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import SmsIcon from "@mui/icons-material/Sms";
import ShareIcon from "@mui/icons-material/Share";

const SendQuoteModal = ({ open, handleClose, quoteDetails }) => {
  const link = `https://sendaquote.co.uk/quote/${quoteDetails.quoteNumber}`;

  const handleShareEmail = () => {
    const subject = `Quote: ${quoteDetails.quoteNumber}`;
    const body = `Hi,\n\nHere are the details of the quote:\n\nQuote Number: ${quoteDetails.quoteNumber}\nFull Name: ${quoteDetails.fullName}\nSubtotal: £${quoteDetails.subtotal}\nTax: £${quoteDetails.tax}\nTotal: £${quoteDetails.total}\n\nBest regards.`;
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        body
      )}`
    );
  };

  const handleShareSms = () => {
    const smsBody = `Quote Details:\nQuote Number: ${quoteDetails.quoteNumber}\nFull Name: ${quoteDetails.fullName}\nSubtotal: £${quoteDetails.subtotal}\nTax: £${quoteDetails.tax}\nTotal: £${quoteDetails.total}`;
    window.open(`sms:?&body=${encodeURIComponent(smsBody)}`);
  };

  const handleShareSocial = () => {
    const shareText = `Quote Details:\nQuote Number: ${quoteDetails.quoteNumber}\nFull Name: ${quoteDetails.fullName}\nSubtotal: £${quoteDetails.subtotal}\nTax: £${quoteDetails.tax}\nTotal: £${quoteDetails.total}`;
    navigator.share
      ? navigator.share({
          title: "Quote Details",
          text: shareText,
        })
      : alert("Sharing not supported on this browser.");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link).then(
      () => {
        alert("Link copied to clipboard!");
      },
      () => {
        alert("Failed to copy the link.");
      }
    );
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: "600px" }, // Responsive width
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Quote Details
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Quote Number: {quoteDetails.quoteNumber}
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Full Name: {quoteDetails.fullName}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Subtotal: £{quoteDetails.subtotal}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Tax (20%): £{quoteDetails.tax}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Total: £{quoteDetails.total}
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            mt: 3,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Divider />
          <Typography variant="h6">Share this quote via</Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 2,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<EmailIcon />}
              onClick={handleShareEmail}
              sx={{
                flex: 1,
                borderRadius: 2,
                textTransform: "none",
              }}
            >
              Email
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<SmsIcon />}
              onClick={handleShareSms}
              sx={{
                flex: 1,
                borderRadius: 2,
                textTransform: "none",
              }}
            >
              SMS
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<ShareIcon />}
              onClick={handleShareSocial}
              sx={{
                flex: 1,
                borderRadius: 2,
                textTransform: "none",
              }}
            >
              Share
            </Button>
          </Box>
          <Divider />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6">Or copy link</Typography>
            <TextField
              fullWidth
              value={link}
              inputProps={{
                readOnly: true,
              }}
            />
            <Button
              variant="contained"
              color="info"
              onClick={handleCopyLink}
              sx={{
                borderRadius: 2,
                textTransform: "none",
              }}
            >
              Copy
            </Button>
          </Box>
        </Box>
        <Box sx={{ textAlign: "right", mt: 9 }}>
          <Button onClick={handleClose} variant="contained" color="primary">
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default SendQuoteModal;
