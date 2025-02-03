import React from "react";
import { Link } from "react-router-dom";
import Button from "@mui/material/Button";

const Navbar = () => {
  return (
    <div className="flex justify-between p-4">
      <Link to="/" className="text-2xl font-bold no-underline">
        Sendaquote
      </Link>
      <Link to="/login">
        <Button
          variant="contained"
          color="secondary"
          className="animate-slideUp transition duration-500 delay-250"
        >
          Log in
        </Button>
      </Link>
    </div>
  );
};

export default Navbar;
