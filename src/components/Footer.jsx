import React from "react";
import { Box, Link, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const companyName = "SendQuote";

  return (
    <footer
      style={{
        backgroundColor: "#083a6b",
        padding: "16px",
        textAlign: "center",
        marginTop: "auto", // Push footer to the bottom of the page
      }}
    >
      <Box className="p-4" sx={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 4,
          }}
        >
          {/* Left Section */}
          <Box className="text-left">
            <Typography gutterBottom sx={{ color: "#fff", fontWeight: "bold" }}>
              SendQuote
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#fff", marginBottom: "32px" }}
            >
              Quote anywhere, anytime with SendQuote.
            </Typography>
          </Box>

          {/* Right Section */}
          <Box className="text-right">
            <Typography
              variant="body2"
              sx={{ color: "#fff", marginBottom: "16px" }}
            >
              <Link
                href="mailto:support@sendquote.app"
                color="inherit"
                underline="hover"
                sx={{
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "flex-start", md: "flex-end" },
                }}
              >
                <FontAwesomeIcon
                  icon={faEnvelope}
                  style={{ marginRight: "8px" }}
                  size="lg"
                />
                support@sendquote.app
              </Link>
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#fff",
                marginTop: "32px",
                textAlign: { xs: "left", md: "right" },
              }}
            >
              &copy; {currentYear} {companyName}. All rights reserved.
            </Typography>
          </Box>
        </Box>
      </Box>
    </footer>
  );
};

export default Footer;
