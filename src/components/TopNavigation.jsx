import { useCallback, useEffect, useRef, useState } from "react";
import { AppBar, Toolbar, IconButton, Typography, Badge } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
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

const TopNavigation = () => {
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
    name: q.customerName ?? "—",
    dateSent: q.updatedAt?.toDate?.()?.toISOString() ?? q.quoteDate ?? new Date().toISOString(),
    status: q.status.charAt(0).toUpperCase() + q.status.slice(1),
  }));

  const handleOpen = (e) => setAnchorEl(e.currentTarget);

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
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
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
          <Badge
            badgeContent={unreadCount}
            color="error"
            overlap="circular"
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <IconButton
              color="inherit"
              sx={{ borderRadius: "50%", width: "32px", height: "32px" }}
              onClick={handleOpen}
              aria-label="Notifications"
              ref={bellRef}
            >
              <FontAwesomeIcon icon={faBell} style={{ color: "#fff" }} />
            </IconButton>
          </Badge>
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
