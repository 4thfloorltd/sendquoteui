import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faCog,
  faHeadphones,
  faPlus,
  faCreditCard,
} from "@fortawesome/free-solid-svg-icons";

const ICON_SIZE = 18;
const LABEL_SIZE = "0.68rem";
const ACTIVE = "#083a6b";
const INACTIVE = "#6B7280";

const NavItem = ({ icon, label, active, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "4px",
      cursor: "pointer",
      color: active ? ACTIVE : INACTIVE,
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      pt: "6px",
    }}
  >
    <FontAwesomeIcon icon={icon} style={{ fontSize: ICON_SIZE, color: "inherit" }} />
    <Typography
      sx={{
        fontSize: LABEL_SIZE,
        fontWeight: active ? 700 : 500,
        color: "inherit",
        lineHeight: 1,
      }}
    >
      {label}
    </Typography>
  </Box>
);

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isQuotes   = location.pathname.startsWith("/secured/quotes");
  const isBilling  = location.pathname.startsWith("/secured/billing");
  const isCreate   = location.pathname === "/secured/quote";
  const isSettings = location.pathname.startsWith("/secured/settings");

  return (
    <>
      {/* FAB — Create */}
      <Box
        onClick={() => navigate("/secured/quote")}
        sx={{
          position: "fixed",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: isCreate ? "#062d52" : "#083a6b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(8,58,107,0.4)",
            border: "3px solid #fff",
            transition: "background 0.15s",
            "&:active": { transform: "scale(0.93)" },
          }}
        >
          <FontAwesomeIcon icon={faPlus} style={{ color: "#fff", fontSize: 18 }} />
        </Box>
        <Typography sx={{ fontSize: LABEL_SIZE, fontWeight: isCreate ? 700 : 500, color: isCreate ? ACTIVE : INACTIVE, lineHeight: 1 }}>
          Create
        </Typography>
      </Box>

      {/* Bar */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          bgcolor: "#fff",
          borderTop: "1px solid #E5E7EB",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
          zIndex: 1000,
          display: "flex",
          alignItems: "stretch",
        }}
      >
        <NavItem icon={faPaperPlane} label="Quotes"   active={isQuotes}   onClick={() => navigate("/secured/quotes")} />
        <NavItem icon={faCreditCard} label="Billing"  active={isBilling}  onClick={() => navigate("/secured/billing")} />

        {/* Spacer for the FAB */}
        <Box sx={{ flex: 1 }} />

        <NavItem icon={faCog}        label="Settings" active={isSettings} onClick={() => navigate("/secured/settings")} />
        <NavItem icon={faHeadphones} label="Support"  active={false}      onClick={() => { window.location.href = "mailto:support@sendquote.ai"; }} />
      </Box>
    </>
  );
};

export default BottomNav;
