import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { lineGross, lineQuantityDisplay } from "../utils/quoteLineCalculations";

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
 * One line item: shared fields; `variant` only changes the outer shell (card stack vs table row).
 */
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
    <TextField
      variant="outlined"
      size="medium"
      type="number"
      label={priceLabel}
      value={priceNum}
      onChange={updateLineField(row.id, "unitPrice")}
      fullWidth
      inputProps={{ min: 0, step: 0.01 }}
      sx={{
        minWidth: 0,
        "& input": {
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        },
      }}
    />
  );

  const qtyField = (
    <TextField
      variant="outlined"
      size="medium"
      type="number"
      label="Qty"
      value={lineQuantityDisplay(row)}
      onChange={updateLineField(row.id, "quantity")}
      fullWidth
      inputProps={{ min: 0, step: 1 }}
      sx={{
        minWidth: 0,
        "& input": { textAlign: "right", fontVariantNumeric: "tabular-nums" },
      }}
    />
  );

  const vatField = (
    <TextField
      variant="outlined"
      size="medium"
      type="number"
      label="VAT %"
      value={row.vatPercent === undefined || row.vatPercent === null ? 20 : row.vatPercent}
      onChange={updateLineField(row.id, "vatPercent")}
      fullWidth
      inputProps={{ min: 0, max: 100, step: 1 }}
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
        "& .MuiOutlinedInput-root": {
          bgcolor: "#E5E7EB",
          "& fieldset": { borderColor: "#E5E7EB" },
          "&:hover fieldset": { borderColor: "#E5E7EB" },
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
          {vatField}
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
      <TableCell
        align="right"
        sx={{ verticalAlign: "top", border: 0, py: 1.5, ...TABLE_COL.vat }}
      >
        {vatField}
      </TableCell>
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
