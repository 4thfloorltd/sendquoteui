import React, { useRef, useState } from "react";
import {
  Button,
  Divider,
  TextField,
  Box,
  Typography,
  IconButton,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import SendQuoteModal from "./SendQuoteModal";
import { useMediaQuery } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
  capitaliseWords,
  formatNumberWithCommas,
  formatUkPhoneNumber,
  formatUkPostcode,
} from "../../helpers/utility";

const Quotes = ({ showForm: initialShowForm = false }) => {
  const [showForm, setShowForm] = useState(initialShowForm);
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quoteDetails, setQuoteDetails] = useState({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    addressLine1: "",
    addressLine2: "",
    townOrCity: "",
    postcode: "",
    email: "",
    phone: "",
    items: [{ quantity: 1, item: "", description: "", price: "" }],
  });
  const [subtotalOpen, setSubtotalOpen] = useState(true);
  const [errors, setErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([]);

  // Refs for each field to scroll to on error
  const refs = {
    firstName: useRef(null),
    lastName: useRef(null),
    email: useRef(null),
    phone: useRef(null),
    addressLine1: useRef(null),
    addressLine2: useRef(null),
    townOrCity: useRef(null),
    postcode: useRef(null),
  };

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const isMobile = useMediaQuery("(max-width:768px)");

  const handleButtonClick = () => {
    setShowForm(!showForm);
    if (!showForm) {
      setQuoteNumber(`QU-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  };

  const handleInputChange = (e, index, field, transform) => {
    let value = e.target.value.replace(/,/g, "");
    if (transform) value = transform(value);
    // Allow user to type a trailing decimal point (e.g. "19.")
    if (field === "price" && value.endsWith(".")) {
      if (/^\d*\.$/.test(value) || value === "") {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
        // Remove item error if valid
        if (itemErrors[index] && itemErrors[index][field]) {
          const newItemErrors = [...itemErrors];
          newItemErrors[index] = {
            ...newItemErrors[index],
            [field]: undefined,
          };
          setItemErrors(newItemErrors);
        }
        return;
      }
    }
    if (typeof index === "number" && field) {
      const newItems = [...formData.items];
      if (field === "price" || field === "quantity") {
        // Allow empty, valid decimals, or trailing decimal
        if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
          newItems[index][field] = value;
          setFormData({ ...formData, items: newItems });
          // Remove item error if valid
          if (itemErrors[index] && itemErrors[index][field]) {
            const newItemErrors = [...itemErrors];
            newItemErrors[index] = {
              ...newItemErrors[index],
              [field]: undefined,
            };
            setItemErrors(newItemErrors);
          }
        }
      } else {
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
        // Remove item error if valid
        if (itemErrors[index] && itemErrors[index][field]) {
          const newItemErrors = [...itemErrors];
          newItemErrors[index] = {
            ...newItemErrors[index],
            [field]: undefined,
          };
          setItemErrors(newItemErrors);
        }
      }
    } else {
      setFormData({ ...formData, [e.target.name]: value });
    }
    const name = field || e.target.name;
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleBlur = (e, index, field) => {
    if (field === "price") {
      const newItems = [...formData.items];
      let value = newItems[index][field];

      if (value && !isNaN(value)) {
        // Format to 2 decimals and add commas
        value = formatNumberWithCommas(parseFloat(value).toFixed(2));
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
      }
    }
  };

  const handleAddRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { quantity: 1, item: "", description: "", price: "" },
      ],
    });
  };

  const handleDeleteRow = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.items
      .reduce(
        (total, item) =>
          total + parseFloat(item.price || 0) * parseInt(item.quantity || 1),
        0
      )
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

  const handleSave = () => {
    const newErrors = {};
    if (!formData.firstName || formData.firstName.trim() === "") {
      newErrors.firstName = "First Name is required";
    }
    if (!formData.lastName || formData.lastName.trim() === "") {
      newErrors.lastName = "Last Name is required";
    }
    if (!formData.email || formData.email.trim() === "") {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Enter a valid email address (e.g. name@example.com)";
    }
    if (!formData.phone || formData.phone.trim() === "") {
      newErrors.phone = "Phone number is required";
    }
    if (!formData.addressLine1 || formData.addressLine1.trim() === "") {
      newErrors.addressLine1 = "At least one address line is required";
    }
    if (!formData.townOrCity || formData.townOrCity.trim() === "") {
      newErrors.townOrCity = "Town or City is required";
    }
    if (!formData.postcode || formData.postcode.trim() === "") {
      newErrors.postcode = "Postcode is required";
    }

    const newItemErrors = [];

    // Validate each item
    formData.items.forEach((item, idx) => {
      const itemErr = {};
      if (
        !item.quantity ||
        isNaN(item.quantity) ||
        Number(item.quantity) <= 0
      ) {
        itemErr.quantity = "Quantity must be greater than 0";
      }
      if (!item.item || item.item.trim() === "") {
        itemErr.item = "Item name is required";
      }
      if (!item.description || item.description.trim() === "") {
        itemErr.description = "Description is required";
      }
      if (
        !item.price ||
        isNaN(Number(item.price.toString().replace(/,/g, ""))) ||
        Number(item.price.toString().replace(/,/g, "")) < 0
      ) {
        itemErr.price = "Valid price is required (e.g. £1.00)";
      }
      newItemErrors[idx] = itemErr;
    });

    setErrors(newErrors);
    setItemErrors(newItemErrors);

    // Scroll to the first error field if any
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      if (refs[firstErrorField] && refs[firstErrorField].current) {
        refs[firstErrorField].current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        refs[firstErrorField].current.focus();
      }
      return false;
    }
    // Scroll to first item error
    const firstItemErrorIdx = newItemErrors.findIndex(
      (err) => err && Object.keys(err).length > 0
    );
    if (firstItemErrorIdx !== -1) {
      const firstItemErrorField = Object.keys(
        newItemErrors[firstItemErrorIdx]
      )[0];
      // Optionally scroll to the first errored item input if you add refs
      return false;
    }

    setErrors({});
    setItemErrors([]);
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!handleSave()) return;

    setQuoteDetails({
      quoteNumber,
      fullName: `${formData.firstName} ${formData.lastName}`,
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      total: calculateTotal(),
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <>
      <Box sx={{ textAlign: "center", mb: 2}}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          {showForm ? "Create a Quote" : "Your Sent Quotes"}
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ color: "gray", fontWeight: 500, mb: 2 }}
        >
          {showForm
            ? "Add details about your quote"
            : "You do not have any quotes sent yet"}
        </Typography>
        {quoteNumber && (
          <Typography
            variant="subtitle1"
            sx={{ mb: 2, color: "gray", textAlign: "left" }}
          >
            <span style={{ fontSize: "0.95em", color: "#888" }}>
              Date: <b>{new Date().toLocaleDateString()}</b>
            </span>
            <br />
            Quote Number: <b>{quoteNumber}</b>
          </Typography>
        )}
      </Box>
      {!showForm ? (
        <Box sx={{ textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleButtonClick}
            sx={{ mr: 2 }}
          >
            <AddIcon />
            Create a Quote
          </Button>
        </Box>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            width: "100%",
            paddingBottom: showSummaryDetails
              ? `${200 + formData.items.length * 24}px`
              : `${64 + formData.items.length * 84}px`,
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Customer information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                name="firstName"
                variant="outlined"
                value={formData.firstName || ""}
                onChange={(e) => handleInputChange(e)}
                error={!!errors.firstName}
                helperText={errors.firstName}
                inputRef={refs.firstName}
                sx={{ width: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                name="lastName"
                variant="outlined"
                value={formData.lastName || ""}
                onChange={(e) => handleInputChange(e)}
                error={!!errors.lastName}
                helperText={errors.lastName}
                inputRef={refs.lastName}
                sx={{ width: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                name="email"
                variant="outlined"
                value={formData.email || ""}
                onChange={(e) =>
                  handleInputChange(e, undefined, undefined, (v) =>
                    v.toLowerCase()
                  )
                }
                error={!!errors.email}
                helperText={errors.email}
                inputRef={refs.email}
                sx={{ width: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone number"
                name="phone"
                type="tel"
                variant="outlined"
                value={formData.phone || ""}
                onChange={(e) => {
                  const formatted = formatUkPhoneNumber(e.target.value);
                  handleInputChange({
                    target: { name: "phone", value: formatted },
                  });
                }}
                error={!!errors.phone}
                helperText={errors.phone}
                inputRef={refs.phone}
                slotProps={{
                  input: {
                    maxLength: 20,
                    pattern:
                      "^(\\+44\\s?7\\d{3}|07\\d{3}|01\\d{3}|02\\d{2,3})\\s?\\d{3,4}\\s?\\d{3,4}$",
                    title:
                      "Enter a valid UK number (e.g. 07123 456 789, 01234 567890, 020 1234 5678, +44 7123 456 789)",
                  },
                }}
                sx={{ width: "100%" }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Address information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Address Line 1"
                name="addressLine1"
                variant="outlined"
                value={formData.addressLine1 || ""}
                onBlur={(e) => {
                  handleInputChange({
                    target: {
                      name: "addressLine1",
                      value: capitaliseWords(e.target.value),
                    },
                  });
                }}
                onChange={(e) => handleInputChange(e)}
                error={!!errors.addressLine1}
                helperText={errors.addressLine1}
                inputRef={refs.addressLine1}
                sx={{ width: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Address Line 2"
                name="addressLine2"
                variant="outlined"
                value={formData.addressLine2 || ""}
                onBlur={(e) => {
                  handleInputChange({
                    target: {
                      name: "addressLine2",
                      value: capitaliseWords(e.target.value),
                    },
                  });
                }}
                onChange={(e) => handleInputChange(e)}
                error={!!errors.addressLine2}
                helperText={errors.addressLine2}
                inputRef={refs.addressLine2}
                sx={{ width: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Town or City"
                name="townOrCity"
                variant="outlined"
                value={formData.townOrCity || ""}
                onBlur={(e) => {
                  handleInputChange({
                    target: {
                      name: "townOrCity",
                      value: capitaliseWords(e.target.value),
                    },
                  });
                }}
                onChange={(e) => handleInputChange(e)}
                error={!!errors.townOrCity}
                helperText={errors.townOrCity}
                inputRef={refs.townOrCity}
                sx={{ width: "100%" }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Postcode"
                name="postcode"
                variant="outlined"
                value={formData.postcode || ""}
                onChange={(e) => {
                  const formatted = formatUkPostcode(e.target.value);
                  handleInputChange({
                    target: { name: "postcode", value: formatted },
                  });
                }}
                error={!!errors.postcode}
                helperText={errors.postcode}
                inputRef={refs.postcode}
                sx={{ width: "100%" }}
              />
            </Grid>
          </Grid>
          <Divider sx={{ width: "100%", my: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Quote Items
          </Typography>
          {formData.items.map((item, index) => (
            <React.Fragment key={index}>
              <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
                <Grid item xs={4} sm={2} md={1}>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleInputChange(e, index, "quantity")}
                    fullWidth
                    error={!!(itemErrors[index] && itemErrors[index].quantity)}
                    helperText={itemErrors[index] && itemErrors[index].quantity}
                    inputProps={{
                      style: { textAlign: "center" },
                      inputMode: "numeric",
                      pattern: "[0-9]*",
                      step: "any",
                      min: 0,
                      onWheel: (e) => e.target.blur(),
                    }}
                    sx={{
                      "& input[type=number]": {
                        MozAppearance: "textfield",
                      },
                      "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
                        {
                          WebkitAppearance: "none",
                          margin: 0,
                        },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label={`Item ${index + 1}`}
                    value={item.item}
                    onChange={(e) => handleInputChange(e, index, "item")}
                    fullWidth
                    error={!!(itemErrors[index] && itemErrors[index].item)}
                    helperText={itemErrors[index] && itemErrors[index].item}
                  />
                </Grid>
                <Grid item xs={12} sm={5} md={6}>
                  <TextField
                    label="Description"
                    value={item.description}
                    onChange={(e) => handleInputChange(e, index, "description")}
                    fullWidth
                    multiline
                    minRows={1}
                    error={
                      !!(itemErrors[index] && itemErrors[index].description)
                    }
                    helperText={
                      itemErrors[index] && itemErrors[index].description
                    }
                  />
                </Grid>
                <Grid
                  item
                  xs={12}
                  sm={2}
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <TextField
                    label="Price (£)"
                    value={item.price}
                    onBlur={(e) => handleBlur(e, index, "price")}
                    onChange={(e) => handleInputChange(e, index, "price")}
                    fullWidth
                    error={!!(itemErrors[index] && itemErrors[index].price)}
                    helperText={itemErrors[index] && itemErrors[index].price}
                  />
                  {index > 0 && (
                    <IconButton
                      aria-label="delete"
                      onClick={() => handleDeleteRow(index)}
                      sx={{
                        ml: 1,
                        color: "#ff385c",
                        border: "1px solid #ff385c",
                        borderRadius: "8px",
                        "&:hover": {
                          backgroundColor: "rgba(244, 67, 54, 0.1)",
                          borderColor: "#ff385c",
                        },
                        width: 36,
                        height: 36,
                      }}
                      size="large"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Grid>
              </Grid>
              {index < formData.items.length - 1 && (
                <Divider
                  sx={{
                    my: 2,
                    borderColor: "#eee",
                    display: {
                      xs: "block",
                      sm: "block",
                      md: "none",
                      lg: "none",
                      xl: "none",
                    },
                  }}
                />
              )}
            </React.Fragment>
          ))}
          <Button
            variant="outlined"
            color="primary"
            onClick={handleAddRow}
            startIcon={<AddIcon />}
            sx={{
              alignSelf: "flex-start",
              mt: 2,
              minWidth: 0,
              px: 2,
            }}
          >
            Add another item
          </Button>
          <Box
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
              // Only add marginBottom if bottom nav is visible
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
                px: 1, // minimal inner horizontal padding
                py: 0, // no extra vertical padding
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
    sx={{ fontWeight: 600, color: "#083a6b", flex: 1, textAlign: "left" }}
  >
    Quote Summary
  </Typography>
  <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
    <Button
      size="small"
      onClick={() => setShowSummaryDetails((prev) => !prev)}
      sx={{
        minWidth: 0,
        px: 2,
        display: "flex",
        alignItems: "center",
      }}
      endIcon={
        showSummaryDetails ? <KeyboardArrowUpIcon /> : <ExpandMoreIcon />
      }
    >
      {showSummaryDetails ? "Collapse" : "Expand"}
    </Button>
  </Box>
  <Box sx={{ flex: 1 }} /> {/* Spacer to balance the row */}
</Box>
                <Divider sx={{ width: "100%", mb: 1 }} />
                <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: { xs: "flex-start" }, // Align summary details left
                  justifyContent: "space-between",
                  width: "100%",
                }}
                >
                <Box sx={{ width: "100%" }}>
                  {/* Show summary details above subtotal/tax/total */}
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
                          .filter(
                            (item) => item.item && item.item.trim() !== ""
                          )
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
                    sx={{
                      fontWeight: "bold",
                      color: "#083a6b",
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
                    Send Quote
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </form>
      )}
      <SendQuoteModal
        open={modalOpen}
        handleClose={handleCloseModal}
        quoteDetails={quoteDetails}
      />
    </>
  );
};

export default Quotes;
