import React from "react";
import Button from "@mui/material/Button";
import DemoVideo from "./DemoVideo";
import Features from "./Features";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div>
      <div className="font-extrabold text-center grid mt-32">
        <h1 className="animate-slideUp transition duration-500 delay-150">
          Sendaquote
        </h1>
      </div>
      <p className="text-xl font-light mt-5 text-center animate-slideUp transition duration-500 delay-200">
        Streamline your quoting process, helping you win more business with
        ease.
      </p>
      <div className="flex items-center justify-center gap-5 mt-5">
        <Link to="/register">
          <Button
            variant="contained"
            color="primary"
            className="animate-slideUp transition duration-500 delay-250"
          >
            Get started
          </Button>
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
      <DemoVideo />
      <Features />
    </div>
  );
};

export default Landing;
