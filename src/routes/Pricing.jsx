import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import CheckIcon from "@mui/icons-material/Check";

const Pricing = () => {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 mt-20">
      <h1 className="animate-slideUp transition">Pricing</h1>

      <div
        className="p-6 rounded-lg w-full max-w-xl"
        sx={{ backgroundColor: "#ffffff" }}
      >
        <Box
          className="feature-item flex flex-col bg-white rounded-lg p-12"
          sx={{
            border: "1px solid lightgrey",
            maxWidth: "400px",
            margin: "0 auto",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ marginBottom: "16px", textAlign: "center" }}
          >
            Essential quoting for professionals
          </Typography>
          <Typography
            variant="body1"
            sx={{ marginBottom: "16px", textAlign: "center" }}
          >
            £4.99/month
          </Typography>
          <Box display="flex" alignItems="center" gutterBottom>
            <CheckIcon sx={{ mr: 1 }} />
            <Typography variant="body2">Create and send quotes</Typography>
          </Box>
          <Box display="flex" alignItems="center" gutterBottom>
            <CheckIcon sx={{ mr: 1 }} />
            <Typography variant="body2">Track quote status</Typography>
          </Box>
          <Box display="flex" alignItems="center" gutterBottom>
            <CheckIcon sx={{ mr: 1 }} />
            <Typography variant="body2">
              Customisable quote templates
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2, width: "100%" }}
            onClick={() => alert("Coming soon!")}
          >
            Go to Checkout
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default Pricing;
