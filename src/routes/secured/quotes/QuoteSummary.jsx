import React from "react";
import { Box, Typography, Divider, Button } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SendIcon from "@mui/icons-material/Send";
import PropTypes from "prop-types";

const QuoteSummary = React.forwardRef((props, ref) => {
  const {
    showSummaryDetails,
    setShowSummaryDetails,
    formData,
    calculateSubtotal,
    calculateTax,
    calculateTotal,
  } = props;

  return (
    <Box
      ref={ref}
      sx={{
        position: "fixed",
        left: { xs: 0, md: "186.07px" },
        bottom: 0,
        width: { xs: "100vw", md: "750px" },
        backgroundColor: "white",
        borderTop: { xs: "1px solid #e0e0e0", md: "none" },
        zIndex: 1200,
        px: 0,
        pt: 1,
        display: "flex",
        justifyContent: "center",
        mb: { xs: "56px", sm: "56px", md: "32px" },
        borderRadius: { md: "8px 8px 0 0" },
        boxShadow: {
          xs: "0 -2px 16px 0 rgba(0,0,0,0.12)",
          md: "0px 1px 3px rgba(0,0,0,0.12), 0px 1px 2px rgba(0,0,0,0.24)",
        },
        right: 0,
        "@media (min-width:768px)": {
          left: "186.07px",
          width: "550px",
          borderTop: "none",
          borderRadius: "8px",
          marginBottom: "32px",
          justifySelf: "center",
        },
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          px: 1,
          py: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            position: "relative",
          }}
        >
          <Typography
            variant="subtitle1"
            color="primary"
            sx={{
              fontWeight: 600,
              flex: 1,
              textAlign: "left",
            }}
          >
            Quote Summary
          </Typography>
          <Box
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Button
              size="small"
              onClick={() => setShowSummaryDetails((prev) => !prev)}
              endIcon={
                showSummaryDetails ? (
                  <KeyboardArrowUpIcon />
                ) : (
                  <ExpandMoreIcon />
                )
              }
            >
              {showSummaryDetails ? "Collapse" : "Expand"}
            </Button>
          </Box>
        </Box>
        <Divider sx={{ width: "100%", mb: 1 }} />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: { xs: "flex-start" },
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Box sx={{ width: "100%" }}>
            {showSummaryDetails && (
              <Box
                sx={{
                  maxHeight:
                    formData.items.filter(
                      (item) => item.item && item.item.trim() !== ""
                    ).length > 10
                      ? 220
                      : "none",
                  overflowY:
                    formData.items.filter(
                      (item) => item.item && item.item.trim() !== ""
                    ).length > 10
                      ? "auto"
                      : "visible",
                  pr:
                    formData.items.filter(
                      (item) => item.item && item.item.trim() !== ""
                    ).length > 10
                      ? 1
                      : 0,
                  transition: "max-height 0.2s",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "gray", fontWeight: 600 }}
                >
                  {
                    formData.items.filter(
                      (item) => item.item && item.item.trim() !== ""
                    ).length
                  }{" "}
                  item
                  {formData.items.filter(
                    (item) => item.item && item.item.trim() !== ""
                  ).length !== 1
                    ? "s"
                    : ""}{" "}
                  added to quote
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {formData.items
                    .filter((item) => item.item && item.item.trim() !== "")
                    .map((item, idx) => (
                      <li
                        key={idx}
                        style={{
                          marginBottom: 2,
                          listStyle: "disc",
                          color: "#083a6b",
                          marginLeft: "0.5rem",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            display: "inline",
                            fontWeight: 500,
                          }}
                        >
                          {item.quantity} × {item.item}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ display: "inline", color: "gray", ml: 1 }}
                        >
                          (£{item.price || "0.00"})
                        </Typography>
                      </li>
                    ))}
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "gray", mt: 5 }}
                >
                  Subtotal: £{calculateSubtotal()}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "gray" }}
                >
                  Tax (20%): £{calculateTax()}
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              mb: 2,
            }}
          >
            <Typography
              color="primary"
              sx={{
                fontWeight: "bold",
                textAlign: "left",
              }}
            >
              Total: £{calculateTotal()}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              startIcon={<SendIcon />}
            >
              Send quote
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
});

QuoteSummary.displayName = "QuoteSummary";

QuoteSummary.propTypes = {
  showSummaryDetails: PropTypes.bool.isRequired,
  setShowSummaryDetails: PropTypes.func.isRequired,
  formData: PropTypes.shape({
    items: PropTypes.arrayOf(
      PropTypes.shape({
        item: PropTypes.string,
        quantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      })
    ),
  }).isRequired,
  calculateSubtotal: PropTypes.func.isRequired,
  calculateTax: PropTypes.func.isRequired,
  calculateTotal: PropTypes.func.isRequired,
};

export default QuoteSummary;
