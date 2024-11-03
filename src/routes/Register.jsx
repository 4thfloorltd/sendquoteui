import React, { useState } from "react";
import { TextField, Button, Typography } from "@mui/material";
import { Link } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 mt-20">
      <h1 className="animate-slideUp transition">Register</h1>
      <div
        className="p-6 rounded-lg w-full max-w-lg"
        style={{ backgroundColor: "#ffffff" }}
      >
        <form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            margin="normal"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            InputProps={{
              style: { backgroundColor: "#f5f5f5", color: "#000" },
            }}
          />
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
      </div>
      <Typography variant="body2">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-500 hover:underline">
          Login
        </Link>
      </Typography>
    </div>
  );
};

export default Register;
