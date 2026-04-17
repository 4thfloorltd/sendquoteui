import { useEffect, useRef, useState } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { lineGross, lineQuantityDisplay } from "../utils/quoteLineCalculations";

/** Muted fill for computed/read-only fields — neutral gray reads as “not editable” vs white inputs */
const READONLY_FIELD_BG = "#ECEFF1";
const READONLY_FIELD_BORDER = "#CFD8DC";

/** Table column widths — must match table `minWidth` / layout in QuoteGenerator */
const TABLE_COL = {
  desc: { width: "42%", minWidth: 176 },
  price: { width: 120 },
  qty: { width: 100 },
  vat: { width: 100 },
  amount: { width: 136 },
  actions: { width: 44, px: 0.5 },
};

function removeLineButtonSx(canRemove) {
  return {
    flexShrink: 0,
    color: canRemove ? "#ff385c" : "#BDBDBD",
    border: `1px solid ${canRemove ? "#ff385c" : "#BDBDBD"}`,
    borderRadius: "8px",
    backgroundColor: canRemove ? "transparent" : "rgba(0,0,0,0.03)",
    "&:hover": {
      backgroundColor: canRemove ? "rgba(244, 67, 54, 0.1)" : "rgba(234, 223, 223, 0.03)",
      borderColor: canRemove ? "#ff385c" : "#BDBDBD",
    },
    width: 36,
    height: 36,
    cursor: canRemove ? "pointer" : "not-allowed",
  };
}

/**
 * Numeric text field that keeps a local draft while the user is typing,
 * syncs from the external value when the field is not focused, and commits
 * the parsed number to the parent only on blur.  This avoids the "1." → "1"
 * snap-back that plagues controlled <input type="number"> / naive text fields.
 */
function NumericTextField({ value: externalValue, onChange, parse, format, inputProps, ...rest }) {
  const [draft, setDraft] = useState(() => format(externalValue));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(format(externalValue));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalValue]);

  return (
    <TextField
      {...rest}
      type="text"
      value={draft}
      inputProps={inputProps}
      onFocus={() => { focused.current = true; }}
      onChange={(e) => {
        const raw = e.target.value;
        // Allow digits, a single leading minus, and a single decimal point.
        if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
        // Notify parent immediately so Amount column stays in sync.
        const parsed = parse(raw);
        onChange({ target: { value: String(parsed) } });
      }}
      onBlur={() => {
        focused.current = false;
        const parsed = parse(draft);
        setDraft(format(parsed));
        onChange({ target: { value: String(parsed) } });
      }}
    />
  );
}

export function QuoteLineItemRow({
  variant,
  row,
  index,
  lineItems,
  activeCurrency,
  formatMoney,
  updateLineField,
  removeLineItem,
  id,
  flash,
  showVat = true,
}) {
  const canRemove = lineItems.length > 1;
  const priceNum =
    typeof row.unitPrice === "number"
      ? row.unitPrice
      : typeof row.amount === "number"
        ? row.amount
        : 0;
  const priceLabel = `Price (${activeCurrency})`;

  const removeButton = (
    <IconButton
      size="medium"
      aria-label="Remove line"
      onClick={() => removeLineItem(row.id)}
      disabled={!canRemove}
      sx={removeLineButtonSx(canRemove)}
    >
      <DeleteOutlineIcon fontSize="medium" />
    </IconButton>
  );

  const descriptionField = (
    <TextField
      variant="outlined"
      size="medium"
      fullWidth
      label="Description"
      value={row.description ?? row.label ?? ""}
      onChange={updateLineField(row.id, "description")}
      multiline
      minRows={1}
      maxRows={6}
      sx={variant === "card" ? { mb: 1.5, minWidth: 0 } : undefined}
    />
  );

  const priceField = (
    <NumericTextField
      variant="outlined"
      size="medium"
      label={priceLabel}
      value={priceNum}
      onChange={updateLineField(row.id, "unitPrice")}
      parse={(raw) => { const n = parseFloat(raw); return Number.isFinite(n) ? Math.max(0, n) : 0; }}
      format={(n) => (n === 0 ? "0" : String(n))}
      fullWidth
      inputProps={{ inputMode: "decimal" }}
      sx={{
        minWidth: 0,
        "& input": { textAlign: "right", fontVariantNumeric: "tabular-nums" },
      }}
    />
  );

  const qtyField = (
    <NumericTextField
      variant="outlined"
      size="medium"
      label="Qty"
      value={lineQuantityDisplay(row)}
      onChange={updateLineField(row.id, "quantity")}
      parse={(raw) => { const n = parseInt(raw, 10); return Number.isFinite(n) ? Math.max(0, n) : 0; }}
      format={(n) => String(n)}
      fullWidth
      inputProps={{ inputMode: "numeric" }}
      sx={{
        minWidth: 0,
        "& input": { textAlign: "right", fontVariantNumeric: "tabular-nums" },
      }}
    />
  );

  const vatPercent = row.vatPercent === undefined || row.vatPercent === null ? 20 : row.vatPercent;
  const vatField = (
    <NumericTextField
      variant="outlined"
      size="medium"
      label="VAT %"
      value={vatPercent}
      onChange={updateLineField(row.id, "vatPercent")}
      parse={(raw) => { const n = parseInt(raw, 10); return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0; }}
      format={(n) => String(n)}
      fullWidth
      inputProps={{ inputMode: "numeric" }}
      sx={{
        minWidth: 0,
        "& input": { textAlign: "right", fontVariantNumeric: "tabular-nums" },
      }}
    />
  );

  const amountField = (
    <TextField
      variant="outlined"
      size="medium"
      label="Amount"
      value={formatMoney(lineGross(row))}
      InputProps={{ readOnly: true }}
      fullWidth
      sx={{
        minWidth: 0,
        pointerEvents: "none",
        bgcolor: READONLY_FIELD_BG,
        borderRadius: 1,
        "& .MuiOutlinedInput-root": {
          bgcolor: READONLY_FIELD_BG,
          backgroundColor: READONLY_FIELD_BG,
          "& fieldset": { borderColor: READONLY_FIELD_BORDER },
          "&:hover fieldset": { borderColor: READONLY_FIELD_BORDER },
        },
        "& .MuiInputBase-input": {
          backgroundColor: READONLY_FIELD_BG,
        },
        "& input": {
          textAlign: "right",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          cursor: "default",
          color: "text.secondary",
        },
        "& .MuiInputLabel-root": {
          color: "text.disabled",
        },
      }}
    />
  );

  const flashSx = flash
    ? {
        animation: "rowFlash 1.8s ease-out forwards",
        "@keyframes rowFlash": {
          "0%": { backgroundColor: "#E0ECFF" },
          "100%": { backgroundColor: "transparent" },
        },
      }
    : undefined;

  /** Mobile view */
  if (variant === "card") {
    return (
      <Paper
        id={id}
        variant="outlined"
        sx={{
          p: 1.5,
          borderColor: "#E5E7EB",
          borderRadius: 2,
          bgcolor: "#FAFAFA",
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
          ...flashSx,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            mb: 1,
            minWidth: 0,
          }}
        >
          <Typography
            variant="body2"
            fontWeight={700}
            color="text.secondary"
            sx={{ minWidth: 0, flex: "1 1 auto" }}
          >
            Item {index + 1}
          </Typography>
          {removeButton}
        </Box>
        {descriptionField}
        <Box
          sx={{
            display: "grid",
            width: "100%",
            minWidth: 0,
            gap: 1.5,
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
          }}
        >
          {priceField}
          {qtyField}
          {showVat && vatField}
          {amountField}
        </Box>
      </Paper>
    );
  }

  return (
    <TableRow id={id} sx={flashSx}>
      <TableCell
        sx={{
          verticalAlign: "top",
          pr: 1,
          border: 0,
          py: 1.5,
          pl: 0,
          ...TABLE_COL.desc,
        }}
      >
        {descriptionField}
      </TableCell>
      <TableCell
        align="right"
        sx={{ verticalAlign: "top", border: 0, ...TABLE_COL.price }}
      >
        {priceField}
      </TableCell>
      <TableCell
        align="right"
        sx={{ verticalAlign: "top", border: 0, py: 1.5, ...TABLE_COL.qty }}
      >
        {qtyField}
      </TableCell>
      {showVat && (
        <TableCell
          align="right"
          sx={{ verticalAlign: "top", border: 0, py: 1.5, ...TABLE_COL.vat }}
        >
          {vatField}
        </TableCell>
      )}
      <TableCell
        align="right"
        sx={{ verticalAlign: "top", border: 0, py: 1.5, ...TABLE_COL.amount }}
      >
        {amountField}
      </TableCell>
      <TableCell
        align="right"
        sx={{ verticalAlign: "middle", border: 0, py: 1.5, ...TABLE_COL.actions }}
      >
        {removeButton}
      </TableCell>
    </TableRow>
  );
}
