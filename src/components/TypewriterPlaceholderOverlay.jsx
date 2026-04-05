import Box from "@mui/material/Box";

/**
 * Absolutely positioned typewriter text + caret behind a transparent input. Wrap the TextField as `children`.
 */
export function TypewriterPlaceholderOverlay({
  show,
  animatedPlaceholder,
  animationKey,
  children,
  sx: rootSx,
  overlaySx,
}) {
  return (
    <Box
      sx={{
        position: "relative",
        flex: "1 1 0",
        minWidth: 0,
        width: "100%",
        overflow: "visible",
        ...rootSx,
      }}
    >
      {show ? (
        <Box
          aria-hidden
          className="pointer-events-none animate-placeholderFadeIn"
          sx={(theme) => ({
            position: "absolute",
            // MUI outlined multiline medium: root padding is 16.5px top / 14px
            // horizontal. The fieldset border is position:absolute so it does
            // NOT offset the content area.
            top: "6.5px",
            left: "7px",
            right: "14px",
            zIndex: 0,
            padding: 0,
            textAlign: "left",
            fontFamily: theme.typography.body1.fontFamily,
            fontWeight: theme.typography.fontWeightBold,
            fontSize: theme.typography.body1.fontSize,
            lineHeight: theme.typography.body1.lineHeight,
            letterSpacing: theme.typography.body1.letterSpacing,
            color: theme.palette.grey[600],
            display: "block",
            overflow: "visible",
            width: "100%",
            boxSizing: "border-box",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            ...(typeof overlaySx === "function" ? overlaySx(theme) : overlaySx ?? {}),
          })}
        >
          <Box
            component="span"
            className="max-w-full whitespace-pre-wrap break-words"
            key={animationKey}
            sx={{ display: "block", width: "100%" }}
          >
            {animatedPlaceholder}
            <Box
              component="span"
              aria-hidden
              sx={{
                ml: "2px",
                display: "inline-block",
                width: "1px",
                height: "1.125em",
                verticalAlign: "text-bottom",
                bgcolor: "#9CA3AF",
                animation: "caretBlink 1.05s step-end infinite",
                "@keyframes caretBlink": {
                  "0%, 49%": { opacity: 1 },
                  "50%, 100%": { opacity: 0 },
                },
              }}
            />
          </Box>
        </Box>
      ) : null}
      {children}
    </Box>
  );
}
