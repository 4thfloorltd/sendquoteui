import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faFileInvoice,
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

/** Same visual language as the old centered FAB: raised circle + label, aligned in the bar row. */
const CreateNavItem = ({ active, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-end",
      pb: "6px",
      cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
      userSelect: "none",
      position: "relative",
      zIndex: 1,
      "&:active .create-fab-circle": { transform: "scale(0.93)" },
    }}
  >
    <Box
      className="create-fab-circle"
      sx={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        bgcolor: active ? "#062d52" : "#083a6b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 10px rgba(8,58,107,0.4)",
        border: "3px solid #fff",
        transition: "background 0.15s, transform 0.15s",
        mt: "-12px",
      }}
    >
      <FontAwesomeIcon icon={faPlus} style={{ color: "#fff", fontSize: 18 }} />
    </Box>
    <Typography
      sx={{
        fontSize: LABEL_SIZE,
        fontWeight: active ? 700 : 500,
        color: active ? ACTIVE : INACTIVE,
        lineHeight: 1,
        mt: "4px",
      }}
    >
      Create
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

  const path = location.pathname;
  const isQuotes =
    path.startsWith("/secured/quotes") ||
    /^\/secured\/quote\/.+/.test(path);
  const isInvoices  = path.startsWith("/secured/invoices");
  const isBilling   = path.startsWith("/secured/billing");
  const isCreate    = path === "/secured/quote";
  const isSupport   = path.startsWith("/secured/support");

  return (
    <>
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
        <NavItem icon={faPaperPlane} label="Quotes" active={isQuotes} onClick={() => navigate("/secured/quotes")} />
        <NavItem icon={faFileInvoice} label="Invoices" active={isInvoices} onClick={() => navigate("/secured/invoices")} />
        <CreateNavItem active={isCreate} onClick={handleCreateQuote} />
        <NavItem icon={faCreditCard} label="Billing" active={isBilling} onClick={() => navigate("/secured/billing")} />
        <NavItem icon={faHeadphones} label="Support" active={isSupport} onClick={() => navigate("/secured/support")} />
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
