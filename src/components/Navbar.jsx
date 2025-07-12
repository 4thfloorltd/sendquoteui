import React from "react";
import { Link } from "react-router-dom";
import { Box, Button } from "@mui/material";
import { SellRounded } from "@mui/icons-material";

const Navbar = () => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        maxWidth: "1280px",
        margin: "64px auto 0",
        padding: "14px",
      }}
    >
      <Link
        to="/"
        className="text-2xl font-bold no-underline"
        style={{ display: "flex", alignItems: "center" }}
      >
        <SellRounded sx={{ marginRight: "8px" }} />
        SendQuote
      </Link>
      <Box sx={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* <Link
          to="/login"
          className="text-sm no-underline text-[#083a6b] hover:underline"
        >
          Log in
        </Link> */}
        {/* <Link to="/pricing">
          <Button
            variant="contained"
            color="primary"
            className="animate-slideUp transition duration-500 delay-250"
          >
            Request Access{" "}
          </Button>
        </Link> */}
      </Box>
    </Box>
  );
};

export default Navbar;
