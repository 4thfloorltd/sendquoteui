import React, { useState } from "react";
import { Button, TextField, Box, Typography, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

const QuoteInput = () => {
  const [showForm, setShowForm] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    items: [{ item: "", description: "", price: "" }],
  });

  const handleButtonClick = () => {
    setShowForm(!showForm);
    if (!showForm) {
      // Generate a new quote number with "QU-" as a suffix
      setQuoteNumber(`QU-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  };

  const handleInputChange = (e, index, field) => {
    const newItems = [...formData.items];
    const value = e.target.value;

    if (field === "price") {
      // Allow only numbers and a single decimal point with max two decimals
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
    return (calculateSubtotal() * 0.2).toFixed(2); // Tax is 20% of subtotal
  };

  const calculateTotal = () => {
    return (
      parseFloat(calculateSubtotal()) + parseFloat(calculateTax())
    ).toFixed(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(
      `Quote Number: ${quoteNumber}\nFull Name: ${
        formData.fullName
      }\n\nItems: ${formData.items
        .map(
          (i, index) =>
            `\nItem ${index + 1}: ${i.item}, Description: ${
              i.description
            }, Price: £${parseFloat(i.price || 0).toFixed(2)}`
        )
        .join(
          ""
        )}\n\nSubtotal: £${calculateSubtotal()}\nTax (20%): £${calculateTax()}\nTotal Price: £${calculateTotal()}`
    );
  };

  return (
    <div className="w-full flex justify-center p-4">
      <div
        className="p-6 rounded-lg shadow-2xl w-full flex flex-col justify-between min-h-[400px]"
        style={{ boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)" }}
      >
        <div>
          <Typography
            variant="h5"
            align="left"
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            Quotes
          </Typography>
          {quoteNumber && (
            <Typography
              variant="subtitle1"
              align="left"
              sx={{ mb: 2, color: "gray" }}
            >
              Quote Number: <b>{quoteNumber}</b>
            </Typography>
          )}
          {!showForm ? (
            <div className="flex justify-center mt-auto">
              {/** Active quotes will appear here */}
              <Button
                variant="contained"
                color="primary"
                onClick={handleButtonClick}
                className="flex space-x-2"
              >
                <AddIcon />
                <Typography variant="button" className="ml-2">
                  Add a Quote
                </Typography>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                  <TextField
                    label="Full Name"
                    name="fullName"
                    variant="outlined"
                    required
                    value={formData.fullName}
                    onChange={(e) => handleInputChange(e)}
                    sx={{ width: "50%" }}
                  />
                </Box>

                {/* Items Section */}
                {formData.items.map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <TextField
                      label="Item"
                      value={item.item}
                      onChange={(e) => handleInputChange(e, index, "item")}
                      required
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Description"
                      value={item.description}
                      onChange={(e) =>
                        handleInputChange(e, index, "description")
                      }
                      required
                      sx={{ flex: 2 }}
                    />
                    <TextField
                      label="Price (£)"
                      value={item.price}
                      onChange={(e) => handleInputChange(e, index, "price")}
                      required
                      sx={{ flex: 1 }}
                    />
                    <IconButton
                      onClick={() => handleDeleteRow(index)}
                      sx={{ borderRadius: 0 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}

                {/* Add Row Button */}
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleAddRow}
                  >
                    Add Row
                  </Button>
                </Box>

                {/* Totals Section */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 1,
                  }}
                >
                  <Typography variant="body2">
                    Subtotal: £{calculateSubtotal()}
                  </Typography>
                  <Typography variant="body2">
                    Tax (20%): £{calculateTax()}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    Total: £{calculateTotal()}
                  </Typography>
                </Box>

                {/* Submit and Cancel Buttons */}
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}
                >
                  <Button variant="contained" color="primary" type="submit">
                    Submit
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      setShowForm(false);
                      setQuoteNumber(null);
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteInput;
