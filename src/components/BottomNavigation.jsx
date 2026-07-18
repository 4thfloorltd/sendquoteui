import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, ListItemIcon, Menu, MenuItem, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faFileInvoice,
  faHeadphones,
  faPlus,
  faCreditCard,
  faEllipsis,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, doc, where } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { FREE_QUOTE_LIMIT } from "../constants/plan";
import SubscribeDialog from "./SubscribeDialog";
import CreateDocumentMenu from "./CreateDocumentMenu";

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
const CreateNavItem = ({ active, onClick, menuOpen }) => (
  <Box
    onClick={onClick}
    role="button"
    aria-haspopup="menu"
    aria-expanded={menuOpen ? "true" : "false"}
    aria-label="Create quote or invoice"
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
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [createMenuAnchor, setCreateMenuAnchor] = useState(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);

  useEffect(() => {
    let unsubProfile = null;
    let unsubQuotes  = null;
    let unsubInvoices = null;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      unsubProfile?.();
      unsubQuotes?.();
      unsubInvoices?.();
      if (!u) {
        setPlan("free");
        setQuoteCount(0);
        setInvoiceCount(0);
        return;
      }

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

      unsubInvoices = onSnapshot(
        query(collection(db, "invoices"), where("userId", "==", u.uid)),
        (snap) => setInvoiceCount(
          snap.docs.filter((d) => !d.data().deleted).length,
        ),
        () => {},
      );
    });
    return () => { unsubAuth(); unsubProfile?.(); unsubQuotes?.(); unsubInvoices?.(); };
  }, []);

  useEffect(() => {
    setCreateMenuAnchor(null);
    setMoreMenuAnchor(null);
  }, [location.pathname]);

  const isPremium       = plan === "premium";
  const isQuotaExhausted = !isPremium && quoteCount >= FREE_QUOTE_LIMIT;
  const isCombinedQuotaExhausted =
    !isPremium && quoteCount + invoiceCount >= FREE_QUOTE_LIMIT;

  const openCreateMenu = (e) => {
    setCreateMenuAnchor((prev) => (prev ? null : e.currentTarget));
  };

  const closeCreateMenu = () => setCreateMenuAnchor(null);
  const closeMoreMenu = () => setMoreMenuAnchor(null);

  const navigateFromMore = (path) => {
    closeMoreMenu();
    navigate(path);
  };

  const path = location.pathname;

  const handleMenuQuote = () => {
    closeCreateMenu();
    if (isQuotaExhausted) setSubscribeOpen(true);
    else if (path === "/secured/quotes") {
      navigate("/secured/quote", { state: { from: "quotes" } });
    } else if (path === "/secured/invoices") {
      navigate("/secured/quote", { state: { from: "invoices" } });
    } else {
      navigate("/secured/quote");
    }
  };

  const handleMenuInvoice = () => {
    closeCreateMenu();
    if (isCombinedQuotaExhausted) setSubscribeOpen(true);
    else navigate("/secured/invoice");
  };

  const isQuotes =
    path.startsWith("/secured/quotes") ||
    /^\/secured\/quote\/.+/.test(path);
  const isInvoices =
    path.startsWith("/secured/invoices") ||
    path.startsWith("/secured/invoice") ||
    /^\/invoice\/.+/.test(path);
  const isBilling   = path.startsWith("/secured/billing");
  const isCreate =
    path === "/secured/quote" ||
    path === "/secured/invoice" ||
    /^\/secured\/quote\/[^/]+$/.test(path) ||
    /^\/secured\/invoice\/[^/]+$/.test(path);
  const isSupport   = path.startsWith("/secured/support");
  const isCustomers =
    path.startsWith("/secured/customers") ||
    path.startsWith("/secured/customer/");
  const isMore = isSupport || isCustomers;

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
        <CreateNavItem
          active={isCreate}
          menuOpen={Boolean(createMenuAnchor)}
          onClick={openCreateMenu}
        />
        <NavItem icon={faCreditCard} label="Billing" active={isBilling} onClick={() => navigate("/secured/billing")} />
        <NavItem
          icon={faEllipsis}
          label="More"
          active={isMore}
          onClick={(event) => setMoreMenuAnchor((current) => (current ? null : event.currentTarget))}
        />
      </Box>

      <CreateDocumentMenu
        anchorEl={createMenuAnchor}
        onClose={closeCreateMenu}
        onQuote={handleMenuQuote}
        onInvoice={handleMenuInvoice}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        disableScrollLock
      />

      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={closeMoreMenu}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        disableScrollLock
        slotProps={{
          paper: {
            sx: {
              minWidth: 190,
              mb: 1,
              borderRadius: 2,
              border: "1px solid #E5E7EB",
              boxShadow: "0 10px 30px rgba(15,23,42,0.16)",
            },
          },
        }}
      >
        <MenuItem
          selected={isCustomers}
          onClick={() => navigateFromMore("/secured/customers")}
          sx={{ py: 1.25, gap: 1 }}
        >
          <ListItemIcon sx={{ minWidth: "30px !important", color: "#083a6b" }}>
            <FontAwesomeIcon icon={faUsers} />
          </ListItemIcon>
          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>Customers</Typography>
          {!isPremium ? (
            <Typography
              component="span"
              sx={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.02em",
                px: 0.75,
                py: 0.15,
                borderRadius: 1,
                bgcolor: "#E8EEF5",
                color: "#083a6b",
              }}
            >
              PRO
            </Typography>
          ) : null}
        </MenuItem>
        <MenuItem
          selected={isSupport}
          onClick={() => navigateFromMore("/secured/support")}
          sx={{ py: 1.25, gap: 1 }}
        >
          <ListItemIcon sx={{ minWidth: "30px !important", color: "#083a6b" }}>
            <FontAwesomeIcon icon={faHeadphones} />
          </ListItemIcon>
          <Typography variant="body2" fontWeight={600}>Support</Typography>
        </MenuItem>
      </Menu>

      <SubscribeDialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        quotaExhausted
      />
    </>
  );
};

export default BottomNav;
