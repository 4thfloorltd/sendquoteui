import { useCallback, useEffect, useRef, useState } from "react";
import { AppBar, Toolbar, Typography, Badge, Box, ButtonBase, useMediaQuery } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCircleUser, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import NotificationModal from "./NotificationModal";

const LS_KEY = "sq_seen_notifs";

const loadSeen = () => {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? "[]")); }
  catch { return new Set(); }
};

const saveSeen = (set) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
};

// A unique key per notification: quoteId + status so a re-opened (edited)
// quote that gets a fresh response shows as unread again.
const notifKey = (q) => `${q.id}_${q.status}`;

const ordinal = (n) => {
  const v = n % 100;
  return n + (["th", "st", "nd", "rd"][(v - 20) % 10] || ["th", "st", "nd", "rd"][v] || "th");
};

const getNotifDateLabel = (date) => {
  const d = date instanceof Date ? date : date?.toDate?.();
  if (!d) return "Earlier";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day   = new Date(d); day.setHours(0, 0, 0, 0);
  const diff  = Math.round((today - day) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 3)  return `${diff} days ago`;
  return `${ordinal(d.getDate())} ${d.toLocaleString("default", { month: "long" })} ${d.getFullYear()}`;
};

const statusLabel = (status) =>
  status === "accepted"
    ? "<span style='color:#22C55E'>Accepted</span>"
    : "<span style='color:#EF4444'>Declined</span>";

const NAV_LABEL_SX = {
  fontSize: "0.68rem",
  fontWeight: 500,
  lineHeight: 1.15,
  color: "rgba(255,255,255,0.92)",
  textAlign: "center",
};

/** Keyboard focus on dark app bar (ButtonBase + Link). */
const NAV_CONTROL_FOCUS_VISIBLE = {
  "&.Mui-focusVisible": {
    outline: "2px solid rgba(255,255,255,0.95)",
    outlineOffset: 2,
    bgcolor: "rgba(255,255,255,0.12)",
  },
};

/** Mobile: one tap target over icon + label (WCAG-friendly min touch size). */
const MOBILE_LABELED_NAV_SX = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 0,
  px: 1.5,
  py: 0.75,
  borderRadius: 2,
  color: "inherit",
  WebkitTapHighlightColor: "transparent",
  textDecoration: "none",
  minWidth: 48,
  minHeight: 48,
  ...NAV_CONTROL_FOCUS_VISIBLE,
};

const navIconWrapSx = {
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const notificationsButtonSx = (mobile) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 0,
  px: mobile ? 1.5 : 1.25,
  py: mobile ? 0.75 : 0.5,
  borderRadius: 2,
  color: "inherit",
  WebkitTapHighlightColor: "transparent",
  textDecoration: "none",
  ...(mobile ? { minWidth: 48, minHeight: 48 } : {}),
  ...NAV_CONTROL_FOCUS_VISIBLE,
});

const TopNavigation = () => {
  const isMobile = useMediaQuery("(max-width:768px)");
  const bellRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [quotes, setQuotes] = useState([]);
  const [seen, setSeen] = useState(loadSeen);

  useEffect(() => {
    let unsubSnap = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const q = query(
        collection(db, "quotes"),
        where("userId", "==", user.uid),
      );
      unsubSnap = onSnapshot(q, (snap) => {
        const sorted = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
        setQuotes(sorted);
      }, (e) => console.error("TopNav quotes error", e));
    });
    return () => { unsubAuth(); unsubSnap?.(); };
  }, []);

  // Mark a single notification as read when the user clicks it.
  const markRead = useCallback((quoteDocId, status) => {
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(`${quoteDocId}_${status}`);
      saveSeen(next);
      return next;
    });
  }, []);

  // Only non-deleted quotes with a customer response count as notifications.
  const responded = quotes.filter((q) => !q.deleted && (q.status === "accepted" || q.status === "declined"));
  const unreadCount = responded.filter((q) => !seen.has(notifKey(q))).length;

  // Build grouped notifications keyed by relative/absolute date label.
  // responded is already sorted newest-first so group insertion order is correct.
  const groupedNotifications = {};
  responded.forEach((q) => {
    const text  = `Quote <b>QU-${q.quoteNumber ?? q.id.slice(0, 6)}</b> was ${statusLabel(q.status)} by ${q.customerName ?? "your customer"}.`;
    const item  = { message: text, quoteDocId: q.id, status: q.status, unread: !seen.has(notifKey(q)) };
    const label = getNotifDateLabel(q.updatedAt ?? q.createdAt);
    if (!groupedNotifications[label]) groupedNotifications[label] = [];
    groupedNotifications[label].push(item);
  });

  // latestQuotes in the shape NotificationModal expects.
  const latestQuotes = responded.map((q) => ({
    quoteDocId: q.id,
    quoteId: `QU-${q.quoteNumber ?? q.id.slice(0, 6)}`,
    name: q.customerName ?? "-",
    dateSent: q.updatedAt?.toDate?.()?.toISOString() ?? q.quoteDate ?? new Date().toISOString(),
    status: q.status.charAt(0).toUpperCase() + q.status.slice(1),
  }));

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
    // Mouse click: drop focus so the button doesn’t stay visibly focused under the popover.
    if (e.detail > 0) e.currentTarget.blur();
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: "#083a6b",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            minHeight: 64,
            py: 0.75,
          }}
        >
          <Link to="/secured/quotes" style={{ textDecoration: "none" }}>
            <Typography
              fontSize="18px"
              fontWeight="bold"
              sx={{ display: "flex", alignItems: "center", color: "#fff" }}
            >
              <FontAwesomeIcon icon={faPaperPlane} style={{ marginRight: "8px" }} />
              SendQuote
            </Typography>
          </Link>
          <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 1 : 0 }}>
            {isMobile && (
              <ButtonBase
                component={Link}
                to="/secured/profile"
                aria-label="Profile"
                disableRipple
                sx={MOBILE_LABELED_NAV_SX}
              >
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <Box sx={navIconWrapSx}>
                    <FontAwesomeIcon icon={faCircleUser} style={{ color: "#fff", fontSize: 18 }} />
                  </Box>
                </Badge>
                <Typography component="span" sx={NAV_LABEL_SX}>
                  Profile
                </Typography>
              </ButtonBase>
            )}
            <ButtonBase
              ref={bellRef}
              type="button"
              aria-label="Notifications"
              aria-haspopup="true"
              onClick={handleOpen}
              disableRipple
              sx={notificationsButtonSx(isMobile)}
            >
              <Badge
                badgeContent={unreadCount}
                color="error"
                overlap="circular"
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <Box sx={navIconWrapSx}>
                  <FontAwesomeIcon icon={faBell} style={{ color: "#fff", fontSize: 18 }} />
                </Box>
              </Badge>
              <Typography component="span" sx={NAV_LABEL_SX}>
                Notifications
              </Typography>
            </ButtonBase>
          </Box>
        </Toolbar>
      </AppBar>
      <NotificationModal
        open={open}
        anchorEl={anchorEl}
        handleClose={() => setAnchorEl(null)}
        latestQuotes={latestQuotes}
        groupedNotifications={groupedNotifications}
        onNotificationClick={markRead}
      />
    </>
  );
};

export default TopNavigation;
