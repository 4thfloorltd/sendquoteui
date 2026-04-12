import { useEffect, useRef, useState } from "react";
import { Fab, Fade } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const SCROLL_SHOW_PX = 320;

/**
 * Keeps scroll listener + visibility state isolated so parent Layout does not
 * re-render on every scroll (which was causing scroll position glitches).
 */
export function ScrollToTopFab({ bottom = 24 }) {
  const [visible, setVisible] = useState(false);
  const lastVisibleRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    const apply = () => {
      rafRef.current = 0;
      const next = window.scrollY > SCROLL_SHOW_PX;
      if (next !== lastVisibleRef.current) {
        lastVisibleRef.current = next;
        setVisible(next);
      }
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Fade in={visible} timeout={200} mountOnEnter unmountOnExit>
      <Fab
        color="primary"
        size="medium"
        aria-label="Scroll to top"
        onClick={scrollToTop}
        sx={{
          position: "fixed",
          right: 16,
          bottom,
          zIndex: (theme) => theme.zIndex.tooltip,
          boxShadow: 3,
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Fade>
  );
}
