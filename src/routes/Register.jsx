import React, { useState, useEffect, useRef } from "react";
import { Box, TextField, Button, Typography } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

const Register = () => {
  const location = useLocation();
  const emailRef = useRef(null);
  const fullNameRef = useRef(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (location.state && location.state.email) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        email: location.state.email,
      }));
    }
  }, [location.state]);

  useEffect(() => {
    const focusField =
      formData.email === "" ? emailRef.current : fullNameRef.current;
    if (focusField) {
      focusField.focus();
    }
  }, [formData.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    if (!validateEmail(email)) {
      setEmailError(true);
      return;
    }
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 mt-20">
      <h1 className="animate-slideUp transition">Register</h1>

      <div
        className="p-6 rounded-lg w-full max-w-lg"
        sx={{ backgroundColor: "#ffffff" }}
      >
        <Box
          className="feature-item flex flex-col bg-white rounded-lg p-12"
          sx={{ border: "1px solid lightgrey" }}
        >
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              margin="normal"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              inputRef={emailRef}
              InputProps={{
                style: { backgroundColor: "#f5f5f5", color: "#000" },
              }}
            />
            <TextField
              label="Full Name"
              variant="outlined"
              fullWidth
              margin="normal"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              inputRef={fullNameRef}
              InputProps={{
                style: { backgroundColor: "#f5f5f5", color: "#000" },
              }}
            />
            <TextField
              label="Password"
              variant="outlined"
              fullWidth
              margin="normal"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              InputProps={{
                style: { backgroundColor: "#f5f5f5", color: "#000" },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ mt: 2, width: "100%" }}
            >
              Register
            </Button>
          </form>
          <Typography variant="body2">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-500 hover:underline">
              Login
            </Link>
          </Typography>
        </Box>
      </div>
    </div>
  );
};

export default Register;
