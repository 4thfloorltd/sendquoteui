import { useEffect, useRef, useState } from "react";
import { Fab, Fade } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const SCROLL_SHOW_PX = 320;
/** Approximate FAB height for overlap test with footer */
const FAB_HEIGHT_PX = 56;

/**
 * Keeps scroll listener + visibility state isolated so parent Layout does not
 * re-render on every scroll (which was causing scroll position glitches).
 */
export function ScrollToTopFab({ bottom = 24 }) {
  const [visible, setVisible] = useState(false);
  const [overFooter, setOverFooter] = useState(false);
  const lastVisibleRef = useRef(false);
  const lastOverFooterRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    const apply = () => {
      rafRef.current = 0;
      const next = window.scrollY > SCROLL_SHOW_PX;
      if (next !== lastVisibleRef.current) {
        lastVisibleRef.current = next;
        setVisible(next);
      }

      const footer = document.getElementById("site-footer");
      let nextOver = false;
      if (footer) {
        const ft = footer.getBoundingClientRect();
        const H = window.innerHeight;
        const fabBottom = H - bottom;
        const fabTop = fabBottom - FAB_HEIGHT_PX;
        nextOver = ft.top < fabBottom && ft.bottom > fabTop;
      }
      if (nextOver !== lastOverFooterRef.current) {
        lastOverFooterRef.current = nextOver;
        setOverFooter(nextOver);
      }
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [bottom]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Fade in={visible} timeout={200} mountOnEnter unmountOnExit>
      <Fab
        color={overFooter ? "inherit" : "primary"}
        size="medium"
        aria-label="Scroll to top"
        onClick={scrollToTop}
        sx={{
          position: "fixed",
          right: 16,
          bottom,
          zIndex: (theme) => theme.zIndex.tooltip,
          boxShadow: 3,
          ...(overFooter
            ? {
              bgcolor: "#fff",
              color: "#083a6b",
              boxShadow: "0 2px 14px rgba(15, 23, 42, 0.18)",
              "&:hover": { bgcolor: "#F0F4FF" },
            }
            : {}),
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Fade>
  );
}
