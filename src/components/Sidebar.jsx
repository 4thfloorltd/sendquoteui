import { useEffect, useState } from "react";
import { FREE_QUOTE_LIMIT } from "../constants/plan";
import { Drawer } from "@mui/material";
import { Box, List, ListItem, Typography, useMediaQuery } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faCreditCard,
  faPaperPlane,
  faHeadphones,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@mui/material";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, setDoc, serverTimestamp, where } from "firebase/firestore";
import { LinearProgress } from "@mui/material";
import { auth, db } from "../../firebase";
import SubscribeDialog from "./SubscribeDialog";

export const SIDEBAR_WIDTH = 260;

const Sidebar = () => {
  const isMobile = useMediaQuery("(max-width:768px)");
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser]               = useState(null);
  const [businessName, setBusinessName]   = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [quoteCount, setQuoteCount]       = useState(0);
  const [plan, setPlan]                   = useState("free");
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const FREE_QUOTA = FREE_QUOTE_LIMIT;

  useEffect(() => {
    let unsubProfile = null;
    let unsubQuotes  = null;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      unsubProfile?.();
      unsubQuotes?.();
      if (!u) { setBusinessName(""); setBusinessEmail(""); setQuoteCount(0); return; }
      unsubProfile = onSnapshot(doc(db, "users", u.uid), (snap) => {
        const d = snap.data();
        setBusinessName(d?.businessName ?? "");
        setBusinessEmail(d?.businessEmail ?? "");
        setPlan(d?.plan ?? "free");
        // Backfill loginEmail for older profiles — only when the document
        // actually exists; guards against recreating a just-deleted doc.
        if (snap.exists() && !d?.loginEmail && u.email) {
          setDoc(doc(db, "users", u.uid), {
            loginEmail: u.email.toLowerCase(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      });
      unsubQuotes = onSnapshot(
        query(collection(db, "quotes"), where("userId", "==", u.uid)),
        (snap) => setQuoteCount(snap.docs.filter((d) => !d.data().deleted).length),
        () => {},
      );
    });
    return () => { unsubAuth(); unsubProfile?.(); unsubQuotes?.(); };
  }, []);

  const isPremium = plan === "premium";
  const isQuotaExhausted = !isPremium && quoteCount >= FREE_QUOTA;

  const handleCreateQuote = () => {
    if (isQuotaExhausted) {
      setSubscribeOpen(true);
    } else {
      navigate("/secured/quote");
    }
  };

  const displayName  = businessName || user?.email?.split("@")[0] || "Account";
  const displayEmail = businessEmail || user?.email || "";
  const words    = displayName.split(/\s+/).filter(Boolean);
  const initials = (words.length >= 2
    ? words.slice(0, 2).map((w) => w[0]).join("")
    : displayName.slice(0, 2)
  ).toUpperCase();

  const menuItems = [
    { label: "Quotes",   icon: faPaperPlane, path: "/secured/quotes" },
    { label: "Billing",  icon: faCreditCard, path: "/secured/billing" },
    { label: "Settings", icon: faCog,        path: "/secured/settings" },
    { label: "Support",  icon: faHeadphones, path: "/secured/support" },
  ];

  const isItemActive = (item) => {
    if (item.path === "/secured/quotes") {
      return (
        location.pathname === "/secured/quotes" ||
        location.pathname === "/secured/quote" ||
        /^\/secured\/quote\/[^/]+/.test(location.pathname) ||
        /^\/quote\/[^/]+/.test(location.pathname)
      );
    }
    if (item.path === "/secured/support") {
      return location.pathname.startsWith("/secured/support");
    }
    return location.pathname === item.path;
  };

  return (
    !isMobile && (
      <>
      <Drawer
        open
        variant="permanent"
        PaperProps={{ sx: { width: SIDEBAR_WIDTH, height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden", position: "fixed", top: "64px", left: 0 } }}
      >
        {/* Logo
        <Link to="/" tabIndex={-1} style={{ textDecoration: "none" }}>
          <Typography
            fontSize={24}
            fontWeight="bold"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#083a6b",
              padding: "16px 0",
            }}
          >
            <FontAwesomeIcon
              icon={faPaperPlane}
              style={{ marginRight: "8px" }}
            />
            SendQuote
          </Typography>
        </Link> */}

        {/* Sidebar Items */}
        <List sx={{ flexGrow: 1, overflowY: "auto" }}>
          {/* Avatar with User Details */}
          <ListItem
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "12px",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <Box sx={{
              width: 40, height: 40, borderRadius: "50%",
              bgcolor: "#083a6b", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "15px", flexShrink: 0,
            }}>
              {initials}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <Typography
                variant="body1"
                sx={{ fontWeight: 700, color: "#083a6b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {displayName}
              </Typography>
              {displayEmail ? (
                <Typography
                  variant="body2"
                  sx={{ fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {displayEmail}
                </Typography>
              ) : null}
            </Box>
          </ListItem>

          {/* Create quote CTA */}
          <ListItem sx={{ px: 2, pb: 1 }}>
            <Button
              onClick={handleCreateQuote}
              variant="contained"
              fullWidth
              startIcon={<FontAwesomeIcon icon={faPlus} style={{ fontSize: "14px" }} />}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#083a6b",
                "&:hover": { bgcolor: "#062d52" },
                borderRadius: 2,
              }}
            >
              Create quote
            </Button>
          </ListItem>

          {/* Menu Items */}
          {menuItems.map((item) => (
            <Link
              to={item.path}
              key={item.label}
              style={{ textDecoration: "none" }}
            >
              <ListItem
                component="div" // Use "div" instead of "button" to avoid the warning
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  color: isItemActive(item) ? "#fff" : "#6B7280",
                  backgroundColor: isItemActive(item) ? "#083a6b" : "inherit",
                  "&:hover": {
                    backgroundColor: "#E5E7EB", // Hover effect for background
                    color: "#083a6b", // Change text color on hover
                    "& svg": {
                      color: "#083a6b", // Change SVG icon color on hover
                      fill: "#083a6b", // Ensure the fill color is also updated
                    },
                  },
                }}
              >
                <FontAwesomeIcon
                  icon={item.icon}
                  className="fa-icon"
                  style={{
                    fontSize: "20px",
                  }}
                />
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    marginLeft: "8px",
                  }}
                >
                  {item.label}
                </Typography>
              </ListItem>
            </Link>
          ))}
        </List>

        {/* Quota widget — hidden for Premium users */}
        {plan !== "premium" ? (
          <Box sx={{ px: 2, pb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#374151", fontSize: "0.75rem" }}>
                Free quotes
              </Typography>
              <Typography variant="caption" sx={{ color: quoteCount >= FREE_QUOTA ? "#EF4444" : "#6B7280", fontWeight: 600, fontSize: "0.75rem" }}>
                {Math.min(quoteCount, FREE_QUOTA)}&nbsp;/&nbsp;{FREE_QUOTA}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min((quoteCount / FREE_QUOTA) * 100, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: "#E5E7EB",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 3,
                  bgcolor: quoteCount >= FREE_QUOTA ? "#EF4444" : "#083a6b",
                },
              }}
            />
            {quoteCount >= FREE_QUOTA ? (
              <Typography
                component={Link}
                to="/secured/billing"
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.75,
                  color: "#EF4444",
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  textDecoration: "underline",
                  "&:hover": { textDecoration: "underline", color: "#DC2626" },
                }}
              >
                Limit reached - upgrade to send more
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: "#9CA3AF", fontSize: "0.7rem" }}>
                {FREE_QUOTA - quoteCount} free quote{FREE_QUOTA - quoteCount !== 1 ? "s" : ""} remaining
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="caption" sx={{ color: "#10A86B", fontWeight: 700, fontSize: "0.75rem" }}>
              ✓ Premium - unlimited quotes
            </Typography>
          </Box>
        )}

      </Drawer>

      <SubscribeDialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        quotaExhausted
      />
      </>
    )
  );
};

export default Sidebar;
