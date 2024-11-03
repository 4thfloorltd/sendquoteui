import React from "react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const companyName = "Sendaquote";

  return (
    <footer className="w-full py-4 text-center">
      <p>
        &copy; {currentYear} {companyName}. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
