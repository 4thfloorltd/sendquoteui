import { useEffect, useState } from "react";
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
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, doc, where } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { FREE_QUOTE_LIMIT } from "../constants/plan";
import SubscribeDialog from "./SubscribeDialog";

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

  const [plan, setPlan]             = useState("free");
  const [quoteCount, setQuoteCount] = useState(0);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  useEffect(() => {
    let unsubProfile = null;
    let unsubQuotes  = null;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      unsubProfile?.();
      unsubQuotes?.();
      if (!u) { setPlan("free"); setQuoteCount(0); return; }

      unsubProfile = onSnapshot(doc(db, "users", u.uid), (snap) => {
        setPlan(snap.data()?.plan ?? "free");
      });

      unsubQuotes = onSnapshot(
        query(collection(db, "quotes"), where("userId", "==", u.uid)),
        (snap) => setQuoteCount(
          snap.docs.filter((d) => !d.data().deleted).length,
        ),
        () => {},
      );
    });
    return () => { unsubAuth(); unsubProfile?.(); unsubQuotes?.(); };
  }, []);

  const isPremium       = plan === "premium";
  const isQuotaExhausted = !isPremium && quoteCount >= FREE_QUOTE_LIMIT;

  const handleCreateQuote = () => {
    if (isQuotaExhausted) {
      setSubscribeOpen(true);
    } else {
      navigate("/secured/quote");
    }
  };

  const isQuotes   = location.pathname.startsWith("/secured/quotes");
  const isBilling  = location.pathname.startsWith("/secured/billing");
  const isCreate   = location.pathname === "/secured/quote";
  const isSettings = location.pathname.startsWith("/secured/settings");

  return (
    <>
      {/* FAB — Create */}
      <Box
        onClick={handleCreateQuote}
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
        <NavItem icon={faHeadphones} label="Support"  active={location.pathname.startsWith("/secured/support")} onClick={() => navigate("/secured/support")} />
      </Box>

      <SubscribeDialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        quotaExhausted
      />
    </>
  );
};

export default BottomNav;
