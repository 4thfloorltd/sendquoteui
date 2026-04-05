import TextField from "@mui/material/TextField";
import { useTypewriterPlaceholder } from "../hooks/useTypewriterPlaceholder";
import { TypewriterPlaceholderOverlay } from "./TypewriterPlaceholderOverlay";

/**
 * Shared animated AI text input.
 *
 * Manages the typewriter placeholder internally – the parent only needs to
 * control `value` / `onChange` / `onSubmit` and any styling overrides.
 *
 * Props
 * ─────
 * value        string   – controlled value
 * onChange     fn(str)  – called with the new string value
 * onSubmit     fn()     – called when Enter (without Shift) is pressed
 * loading      bool     – disables the field while an async op is in flight
 * error        bool     – shows the MUI error outline
 * inputRef     ref      – forwarded to the underlying <input> for imperative focus
 * minRows      number   – default 3
 * maxRows      number   – default 8
 * variant      string   – MUI TextField variant ("outlined" | "standard"), default "outlined"
 * rootSx       sx       – sx applied to the outer Box (TypewriterPlaceholderOverlay root)
 * overlaySx    sx|fn    – sx applied to the animated-placeholder overlay box
 * textFieldSx  sx       – sx applied to the TextField itself
 * …rest                 – any other TextField props (e.g. InputProps, inputProps, id, slotProps)
 */
export function AiPromptField({
  value,
  onChange,
  onSubmit,
  loading = false,
  error = false,
  inputRef,
  minRows = 3,
  maxRows = 8,
  variant = "outlined",
  rootSx,
  overlaySx,
  textFieldSx,
  ...textFieldProps
}) {
  const placeholderEnabled = !value.trim() && !loading;
  const { animatedPlaceholder, twIndex } = useTypewriterPlaceholder(placeholderEnabled);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    textFieldProps.onKeyDown?.(e);
  };

  return (
    <TypewriterPlaceholderOverlay
      show={placeholderEnabled}
      animatedPlaceholder={animatedPlaceholder}
      animationKey={twIndex}
      sx={rootSx}
      overlaySx={overlaySx}
    >
      <TextField
        fullWidth
        multiline
        minRows={minRows}
        maxRows={maxRows}
        placeholder=""
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        error={error}
        variant={variant}
        inputRef={inputRef}
        sx={[{ position: "relative", zIndex: 1 }, ...(Array.isArray(textFieldSx) ? textFieldSx : [textFieldSx])].filter(Boolean)}
        {...textFieldProps}
      />
    </TypewriterPlaceholderOverlay>
  );
}
