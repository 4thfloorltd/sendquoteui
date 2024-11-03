import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <div className="flex items-center p-4">
      <Link to="/" className="text-2xl font-bold no-underline">
        Sendaquote
      </Link>
    </div>
  );
};

export default Navbar;
