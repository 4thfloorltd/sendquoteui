import React, { useState, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  useMediaQuery,
  Drawer,
  Grid,
  List,
  ListItem,
} from "@mui/material";
import { Link } from "react-router-dom";
import { capitaliseWords, formatUkPostcode } from "../../helpers/utility";

const Settings = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    townOrCity: "",
    postcode: "",
  });

  const isMobile = useMediaQuery("(max-width:768px)");
  const [errors, setErrors] = useState({});

  // Refs for each field to scroll to on error
  const refs = {
    companyName: useRef(null),
    email: useRef(null),
    addressLine1: useRef(null),
    addressLine2: useRef(null),
    townOrCity: useRef(null),
    postcode: useRef(null),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Remove error for this field as user types
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSave = () => {
    const newErrors = {};
    if (!formData.companyName || formData.companyName.trim() === "") {
      newErrors.companyName = "Company Name is required";
    }
    if (!formData.email || formData.email.trim() === "") {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Enter a valid email address (e.g. name@example.com)";
    }
    // Require at least one address line
    if (
      (!formData.addressLine1 || formData.addressLine1.trim() === "") &&
      (!formData.addressLine2 || formData.addressLine2.trim() === "")
    ) {
      newErrors.addressLine1 = "At least one address line is required";
      newErrors.addressLine2 = "At least one address line is required";
    }
    if (!formData.townOrCity || formData.townOrCity.trim() === "") {
      newErrors.townOrCity = "Town or City is required";
    }
    if (!formData.postcode || formData.postcode.trim() === "") {
      newErrors.postcode = "Postcode is required";
    }

    setErrors(newErrors);

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
      return;
    }

    setErrors({});
    console.log("Saving company settings:", formData);
    alert("Settings saved!");
  };
  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      autoComplete="off"
    >
      {" "}
      <Box sx={{ mb: 2}}>
        <Typography
          variant="h5"
          sx={{ fontWeight: "bold", textAlign: "center" }}
        >
          Settings
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ color: "gray", fontWeight: 500, mb: 2, textAlign: "center" }}
        >
          Manage your company information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Company information
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Company Name"
              name="companyName"
              variant="outlined"
              required
              value={formData.companyName}
              onChange={handleChange}
              error={!!errors.companyName}
              helperText={errors.companyName}
              inputRef={refs.companyName}
              sx={{ width: "100%" }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              name="email"
              type="email"
              variant="outlined"
              required
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              inputRef={refs.email}
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
              required
              value={formData.addressLine1 || ""}
              onBlur={(e) => {
                handleChange({
                  target: {
                    name: "addressLine1",
                    value: capitaliseWords(e.target.value),
                  },
                });
              }}
              onChange={handleChange}
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
                handleChange({
                  target: {
                    name: "addressLine2",
                    value: capitaliseWords(e.target.value),
                  },
                });
              }}
              onChange={handleChange}
              inputRef={refs.addressLine2}
              sx={{ width: "100%" }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Town or City"
              name="townOrCity"
              variant="outlined"
              required
              value={formData.townOrCity || ""}
              onBlur={(e) => {
                handleChange({
                  target: {
                    name: "townOrCity",
                    value: capitaliseWords(e.target.value),
                  },
                });
              }}
              onChange={handleChange}
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
              required
              value={formData.postcode || ""}
              onChange={(e) => {
                const formatted = formatUkPostcode(e.target.value);
                handleChange({
                  target: { name: "postcode", value: formatted },
                });
              }}
              error={!!errors.postcode}
              helperText={errors.postcode}
              inputRef={refs.postcode}
              sx={{ width: "100%" }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              sx={{ mt: 2, alignSelf: "flex-start" }}
            >
              Save Settings
            </Button>
          </Grid>
        </Grid>
      </Box>
    </form>
  );
};

export default Settings;
