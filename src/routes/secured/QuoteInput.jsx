import React, { useState } from "react";
import {
  Button,
  Divider,
  TextField,
  Box,
  Typography,
  Modal,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import SendQuoteModal from "./SendQuoteModal";

const QuoteInput = () => {
  const [showForm, setShowForm] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quoteDetails, setQuoteDetails] = useState({});
  const [formData, setFormData] = useState({
    fullName: "",
    items: [{ item: "", description: "", price: "" }],
  });

  const handleButtonClick = () => {
    setShowForm(!showForm);
    if (!showForm) {
      setQuoteNumber(`QU-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  };

  const handleInputChange = (e, index, field) => {
    const newItems = [...formData.items];
    const value = e.target.value;

    if (field === "price") {
      if (/^\d*\.?\d{0,2}$/.test(value)) {
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
      }
    } else if (field) {
      newItems[index][field] = value;
      setFormData({ ...formData, items: newItems });
    } else {
      setFormData({ ...formData, [e.target.name]: value });
    }
  };

  const handleBlur = (e, index, field) => {
    if (field === "price") {
      const newItems = [...formData.items];
      let value = newItems[index][field];

      if (value && /^\d+$/.test(value)) {
        value = `${value}.00`;
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
      }
    }
  };

  const handleAddRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item: "", description: "", price: "" }],
    });
  };

  const handleDeleteRow = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.items
      .reduce((total, item) => total + parseFloat(item.price || 0), 0)
      .toFixed(2);
  };

  const calculateTax = () => {
    return (calculateSubtotal() * 0.2).toFixed(2);
  };

  const calculateTotal = () => {
    return (
      parseFloat(calculateSubtotal()) + parseFloat(calculateTax())
    ).toFixed(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setQuoteDetails({
      quoteNumber,
      fullName: formData.fullName,
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      total: calculateTotal(),
    });
    setModalOpen(true); // Open modal on submit
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <div className="w-full flex justify-center p-4 min-h-screen">
      <div
        className="px-6 py-6 pt-0 rounded-lg flex flex-col justify-center items-center self-start"
        style={{
          maxWidth: "768px", // Set the maximum width for the form container
          width: "100%", // Ensure responsiveness
        }}
        sx={{
          maxWidth: {
            xs: "100%", // No max width on small devices
            sm: "768px", // Apply max width only on small and larger devices
          },
        }}
      >
        <div style={{ textAlign: "center", width: "100%" }}>
          {showForm ? (
            <>
              <Typography
                variant="h5"
                align="center"
                sx={{ fontWeight: "bold" }}
              >
                Create a Quote
              </Typography>
              <Typography
                variant="subtitle1"
                align="center"
                sx={{ color: "gray", fontWeight: 500, mb: 2 }}
              >
                Add details about your quote.
              </Typography>
            </>
          ) : (
            <>
              <Typography
                variant="h5"
                align="center"
                sx={{ fontWeight: "bold" }}
              >
                Your Sent Quotes
              </Typography>
              <Typography
                variant="subtitle1"
                align="center"
                sx={{ color: "gray", fontWeight: 500, mb: 2 }}
              >
                You do not have any quotes sent yet.
              </Typography>
            </>
          )}
          {quoteNumber && (
            <Typography
              variant="subtitle1"
              align="start"
              sx={{ mb: 2, color: "gray" }}
            >
              Quote Number: <b>{quoteNumber}</b>
            </Typography>
          )}
          {!showForm ? (
            <div className="flex justify-center mt-4 space-x-2">
              <Button
                variant="contained"
                color="primary"
                onClick={handleButtonClick}
                className="flex space-x-2"
              >
                <AddIcon />
                <Typography variant="button" className="ml-2">
                  Create a Quote
                </Typography>
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  alert("Create a Quote with AI");
                }}
                className="flex space-x-2"
              >
                <AutoAwesomeIcon />
                <Typography variant="button" className="ml-2">
                  Create a Quote with AI
                </Typography>
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                width: "100%",
                maxWidth: "768px", // Set the maximum width for the form
                paddingBottom: "125px",
              }}
            >
              <TextField
                label="Full Name"
                name="fullName"
                variant="outlined"
                required
                value={formData.fullName}
                onChange={(e) => handleInputChange(e)}
                sx={{ width: "100%" }}
              />
              {/* Items Section */}
              {formData.items.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr", // Single column on extra small screens
                      sm: "1.5fr 3fr 1fr auto", // Responsive layout for larger screens
                    },
                    gap: 2,
                    width: "100%",
                  }}
                >
                  <TextField
                    label={`Item ${index + 1}`}
                    value={item.item}
                    onChange={(e) => handleInputChange(e, index, "item")}
                    required
                    sx={{
                      width: "100%",
                    }}
                  />
                  <TextField
                    label="Description"
                    value={item.description}
                    onChange={(e) => handleInputChange(e, index, "description")}
                    required
                    multiline
                    sx={{
                      width: "100%",
                    }}
                  />
                  <TextField
                    label="Price (£)"
                    value={item.price}
                    onBlur={(e) => handleBlur(e, index, "price")}
                    onChange={(e) => handleInputChange(e, index, "price")}
                    required
                    sx={{
                      width: "100%",
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => handleDeleteRow(index)}
                    endIcon={<DeleteIcon />} // Adds the DeleteIcon to the right of the text
                    sx={{
                      justifySelf: "center", // Centers the delete button if inside a grid or flex container
                      textTransform: "none", // Prevents text from being uppercase
                      color: "#ff385c", // Light red text color
                      borderColor: "#ff385c", // Light red border color
                      "&:hover": {
                        backgroundColor: "rgba(244, 67, 54, 0.1)", // Light red hover effect
                        borderColor: "#f44336", // Keep border consistent on hover
                      },
                    }}
                  >
                    Delete
                  </Button>
                </Box>
              ))}
              <Button
                variant="outlined"
                color="primary"
                onClick={handleAddRow}
                startIcon={<AddIcon />} // Adds the AddIcon to the left of the text
              >
                Add Row
              </Button>
              {/* Combined Totals and Buttons Section */}
              <Box
                sx={{
                  position: "fixed", // Fixes the section to the bottom
                  bottom: 0, // Places it at the very bottom
                  left: 0,
                  right: 0,
                  backgroundColor: "white", // Ensures the section has a background
                  zIndex: 1000, // Ensures it stays above other content
                  boxShadow: "0 -2px 4px rgba(0, 0, 0, 0.1)", // Adds a shadow for separation
                  padding: 2, // Adds padding for spacing
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  width: "100%",
                }}
              >
                {/* Totals Section */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 1,
                    width: "100%",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "gray" }}
                  >
                    Subtotal: £{calculateSubtotal()}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "gray" }}
                  >
                    Tax (20%): £{calculateTax()}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", color: "#000" }}
                  >
                    Total: £{calculateTotal()}
                  </Typography>
                </Box>

                {/* Divider */}
                <Divider sx={{ width: "100%" }} />

                {/* Buttons Section */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({
                        fullName: "",
                        items: [{ item: "", description: "", price: "" }], // Reset to initial state
                      });
                      setQuoteNumber(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    startIcon={<SendIcon />} // Adds the SendIcon to the left of the text
                  >
                    Send Quote
                  </Button>
                </Box>
              </Box>
            </form>
          )}
          <SendQuoteModal
            open={modalOpen}
            handleClose={handleCloseModal}
            quoteDetails={quoteDetails}
          />
        </div>
      </div>
    </div>
  );
};

export default QuoteInput;
