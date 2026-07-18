import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faClock, faFileInvoice } from "@fortawesome/free-solid-svg-icons";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebase";
import { APP_PAGE_CONTENT_MAX_WIDTH } from "../../constants/site";
import {
  AWAITING_STATUS_CHIP_SX,
  AWAITING_STATUS_METRIC_BG,
  AWAITING_STATUS_METRIC_ICON_COLOR,
} from "../../constants/quoteUi";
import SubscribeDialog from "../../components/SubscribeDialog";
import { isCombinedFreeTierQuotaExceeded } from "../../utils/securedDocQuota";

const STATUS_CFG = {
  unpaid: { label: "Unpaid", color: AWAITING_STATUS_METRIC_ICON_COLOR, icon: faClock, chipSx: AWAITING_STATUS_CHIP_SX },
  paid: { label: "Paid", color: "#22C55E", icon: faCheckCircle, chipColor: "success" },
};

export default function Invoices() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isDesktopNav = useMediaQuery("(min-width:769px)");
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("free");
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 7;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let unsubInv = null;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubInv?.();
      unsubInv = null;
      if (!user) {
        setLoading(false);
        setInvoices([]);
        setPlan("free");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setPlan(snap.exists() ? (snap.data()?.plan ?? "free") : "free");
      } catch (e) {
        console.warn("Invoices: plan read failed", e);
      }

      unsubInv = onSnapshot(
        query(collection(db, "invoices"), where("userId", "==", user.uid)),
        (snap) => {
          const rows = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((inv) => !inv.deleted)
            .sort((a, b) => {
              const ta = a.createdAt?.toMillis?.() ?? 0;
              const tb = b.createdAt?.toMillis?.() ?? 0;
              return tb - ta;
            });
          setInvoices(rows);
          setLoading(false);
        },
        (e) => {
          console.error("Invoices snapshot error", e);
          setLoading(false);
        },
      );
    });
    return () => {
      unsubAuth();
      unsubInv?.();
    };
  }, []);

  const formatDate = (inv) => {
    const raw = inv.invoiceDate;
    if (!raw) return "-";
    return new Date(`${raw}T12:00:00`).toLocaleDateString(isXs ? "en-GB" : "en-US", isXs
      ? { day: "2-digit", month: "2-digit", year: "2-digit" }
      : { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== null && inv.status !== statusFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const invNum = String(inv.invoiceNumber ?? "").toLowerCase();
    const name = String(inv.customerName ?? "").toLowerCase();
    const email = String(inv.customerEmail ?? "").toLowerCase();
    return name.includes(q) || email.includes(q) || invNum.includes(q) || `inv-${invNum}`.includes(q);
  });

  const displayed = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const unpaidCt = invoices.filter((i) => i.status === "unpaid").length;
  const paidCt = invoices.filter((i) => i.status === "paid").length;
  const totalCt = invoices.length;

  const metrics = [
    { title: "Total", value: totalCt, icon: faFileInvoice, color: "#083a6b", bg: "#F0F4F8", filterKey: null },
    { title: "Unpaid", value: unpaidCt, icon: faClock, color: AWAITING_STATUS_METRIC_ICON_COLOR, bg: AWAITING_STATUS_METRIC_BG, filterKey: "unpaid" },
    { title: "Paid", value: paidCt, icon: faCheckCircle, color: "#166534", bg: "#F0FDF4", filterKey: "paid" },
  ];

  const handleMetricClick = (filterKey) => {
    setVisibleCount(PAGE_SIZE);
    if (filterKey === null) {
      setStatusFilter(null);
    } else {
      setStatusFilter((prev) => (prev === filterKey ? null : filterKey));
    }
  };

  const isPremium = plan === "premium";

  const handleCreateInvoice = async () => {
    const u = auth.currentUser;
    if (!u) return;
    if (!isPremium) {
      try {
        if (await isCombinedFreeTierQuotaExceeded(db, u.uid)) {
          setSubscribeOpen(true);
          return;
        }
      } catch (e) {
        console.warn("Invoices: quota check failed", e);
      }
    }
    navigate("/secured/invoice");
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: APP_PAGE_CONTENT_MAX_WIDTH,
        mx: "auto",
        boxSizing: "border-box",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100dvh - 166px)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: isDesktopNav ? "row" : "column",
          justifyContent: "space-between",
          alignItems: isDesktopNav ? "flex-start" : "stretch",
          mb: 3,
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <FontAwesomeIcon icon={faFileInvoice} style={{ color: "#083a6b", fontSize: "1.25rem", flexShrink: 0 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#083a6b" }}>
              Invoices
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Create and manage invoices from your account.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
          <TextField
            size="small"
            placeholder="Search by name, email or invoice ID…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
            sx={{ width: isDesktopNav ? 340 : "100%" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "#9CA3AF" }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setSearchQuery(""); setVisibleCount(PAGE_SIZE); }} aria-label="Clear search" sx={{ width: 32, height: 32, padding: 0 }}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateInvoice}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "#083a6b",
              "&:hover": { bgcolor: "#062d52" },
              borderRadius: 2,
              px: 3,
              flexShrink: 0,
              display: isDesktopNav ? "inline-flex" : "none",
            }}
          >
            Create an invoice
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4, flexShrink: 0, width: "100%", minWidth: 0, boxSizing: "border-box" }}>
        {metrics.map((m, i) => {
          const selected =
            (m.filterKey === null && statusFilter === null) ||
            (m.filterKey !== null && statusFilter === m.filterKey);
          return (
            <Grid item xs={6} sm={4} key={i}>
              <Card
                onClick={() => handleMetricClick(m.filterKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleMetricClick(m.filterKey);
                  }
                }}
                sx={{
                  backgroundColor: m.bg,
                  borderRadius: "14px",
                  boxShadow: selected
                    ? "0px 2px 8px rgba(0,0,0,0.04), 0 0 0 2px #083a6b"
                    : "0px 2px 8px rgba(0,0,0,0.04)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  cursor: "pointer",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: selected ? "0px 4px 14px rgba(0,0,0,0.08), 0 0 0 2px #083a6b" : "0px 4px 14px rgba(0,0,0,0.08)" },
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 }, p: { xs: 1.25, sm: 2 }, "&:last-child": { pb: { xs: 1.25, sm: 2 } }, overflow: "hidden" }}>
                  <Box sx={{ bgcolor: "#fff", borderRadius: "50%", width: { xs: 32, sm: 48 }, height: { xs: 32, sm: 48 }, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0px 2px 6px rgba(0,0,0,0.05)", flexShrink: 0 }}>
                    <FontAwesomeIcon icon={m.icon} style={{ fontSize: "14px", color: m.color }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
                      {m.title}
                    </Typography>
                    {loading ? <CircularProgress size={16} sx={{ mt: 0.5 }} /> : (
                      <Typography sx={{ fontWeight: 700, color: "#083a6b", lineHeight: 1.2, fontSize: { xs: "1.1rem", sm: "1.25rem" } }}>
                        {m.value}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: { xs: 6, sm: 0 }, flex: { sm: 1 }, minHeight: { sm: 0 } }}>
            <CircularProgress />
          </Box>
        ) : invoices.length === 0 ? (
          <Box sx={{ flex: { sm: 1 }, minHeight: { sm: 0 }, display: "flex", alignItems: "center", justifyContent: "center", overflow: { sm: "auto" } }}>
            <Paper elevation={0} sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: 6, textAlign: "center" }}>
              <Typography color="text.secondary" sx={{ mb: 1 }}>You don&apos;t have any invoices yet.</Typography>
              <Typography variant="body2" color="text.secondary">
                Use <Box component="span" sx={{ fontWeight: 700, color: "#083a6b" }}>Create an invoice</Box> above to add one, or convert an accepted quote.
              </Typography>
            </Paper>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ flex: { sm: 1 }, minHeight: { sm: 0 }, display: "flex", alignItems: "center", justifyContent: "center", overflow: { sm: "auto" } }}>
            <Paper elevation={0} sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: 4, textAlign: "center" }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {searchQuery
                  ? `No invoices found for "${searchQuery}".`
                  : `No ${STATUS_CFG[statusFilter]?.label?.toLowerCase() ?? statusFilter} invoices.`}
              </Typography>
              <Button variant="outlined" onClick={() => { setStatusFilter(null); setSearchQuery(""); setVisibleCount(PAGE_SIZE); }} sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b" }}>
                Clear filters
              </Button>
            </Paper>
          </Box>
        ) : (
          <Box
            sx={{
              width: "100%",
              minHeight: 0,
              display: { sm: "grid" },
              gridTemplateRows: { sm: "auto auto" },
            }}
          >
            <Box sx={{ width: "100%", minHeight: 0 }}>
              {isXs ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {displayed.map((inv) => {
                    const cfg = STATUS_CFG[inv.status] ?? STATUS_CFG.unpaid;
                    const total = inv.pricing?.total ?? 0;
                    const currency = inv.currency ?? "GBP";
                    const formatted = new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(total);
                    return (
                      <Paper key={inv.id} elevation={0} onClick={() => navigate(`/secured/invoice/${inv.id}`)} sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: 2, cursor: "pointer", "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.08)", borderColor: "#083a6b" } }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                          <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.customerName ?? "-"}</Typography>
                            <Typography variant="caption" sx={{ color: "#6B7280" }}>INV-{inv.invoiceNumber ?? "-"} · {formatDate(inv)}</Typography>
                          </Box>
                          <Chip
                            label={cfg.label}
                            {...(cfg.chipColor ? { color: cfg.chipColor } : {})}
                            size="small"
                            sx={{ fontWeight: 600, fontSize: "11px", flexShrink: 0, ...cfg.chipSx }}
                          />
                        </Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#083a6b" }}>{formatted}</Typography>
                      </Paper>
                    );
                  })}
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid #E5E7EB", width: "100%", minHeight: 0, overflowX: "auto", overflowY: "visible" }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {["Customer", "Invoice ID", "Date", "Total", "Status", ""].map((label) => (
                          <TableCell
                            key={label}
                            sx={{
                              fontWeight: 700,
                              color: "#fff",
                              fontSize: "13px",
                              borderBottom: "2px solid #E5E7EB",
                              py: 1.5,
                              backgroundColor: "#083a6b",
                              "&.MuiTableCell-stickyHeader": {
                                backgroundColor: "#083a6b",
                              },
                            }}
                          >
                            {label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayed.map((inv) => {
                        const cfg = STATUS_CFG[inv.status] ?? STATUS_CFG.unpaid;
                        const total = inv.pricing?.total ?? 0;
                        const currency = inv.currency ?? "GBP";
                        const formatted = new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(total);
                        return (
                          <TableRow key={inv.id} onClick={() => navigate(`/secured/invoice/${inv.id}`)} sx={{ cursor: "pointer", "&:hover": { bgcolor: "#EFF6FF" } }}>
                            <TableCell sx={{ maxWidth: 220, py: 1.75 }}>
                              <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.customerName ?? "-"}</Typography>
                              {inv.customerEmail ? <Typography variant="caption" sx={{ color: "#9CA3AF", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.customerEmail}</Typography> : null}
                            </TableCell>
                            <TableCell sx={{ fontSize: "13px", whiteSpace: "nowrap", color: "#083a6b", fontWeight: 700, py: 1.75 }}>INV-{inv.invoiceNumber ?? "-"}</TableCell>
                            <TableCell sx={{ fontSize: "13px", whiteSpace: "nowrap", color: "#6B7280", py: 1.75 }}>{formatDate(inv)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: "13px", whiteSpace: "nowrap", fontWeight: 700, py: 1.75 }}>{formatted}</TableCell>
                            <TableCell sx={{ py: 1.75 }}>
                              <Chip
                                label={cfg.label}
                                {...(cfg.chipColor ? { color: cfg.chipColor } : {})}
                                size="small"
                                sx={{ fontWeight: 600, fontSize: "12px", ...cfg.chipSx }}
                              />
                            </TableCell>
                            <TableCell sx={{ width: 40, p: 0, pr: 1.5 }}>
                              <ChevronRightIcon sx={{ color: "#083a6b", fontSize: 22 }} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
            <Box sx={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, pt: 2.5, mt: "auto" }}>
              {hasMore && (
                <Button variant="outlined" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} sx={{ textTransform: "none", fontWeight: 600, borderColor: "#083a6b", color: "#083a6b", minWidth: 160 }}>
                  Load more
                </Button>
              )}
              <Typography variant="caption" color="text.secondary">
                Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <SubscribeDialog open={subscribeOpen} onClose={() => setSubscribeOpen(false)} quotaExhausted />
    </Box>
  );
}
