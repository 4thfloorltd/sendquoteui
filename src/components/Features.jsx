import React from "react";
import { Box, Typography } from "@mui/material";
import { CreditScore, TableRows, Calculate } from "@mui/icons-material";
import useInView from "../hooks/useInView";

export const FeatureItem = ({ icon, title, description }) => {
  return (
    <Box
      className="feature-item flex flex-col bg-white rounded-lg p-12"
      sx={{ border: "1px solid lightgrey" }}
    >
      {/* Icon Section */}
      <Box
        className="rounded-full bg-[#174082] p-4 flex items-center justify-center mb-4"
        style={{
          width: "64px",
          height: "64px",
        }}
      >
        {icon}
      </Box>
      {/* Title Section */}
      <Typography
        variant="h6"
        className="text-lg my-3"
        sx={{ color: "#333", fontWeight: "bold" }}
      >
        {title}
      </Typography>
      {/* Description Section */}
      <Typography
        variant="body2"
        className="text-sm font-light"
        style={{ color: "#666" }}
      >
        {description}
      </Typography>
    </Box>
  );
};

const Features = () => {
  return (
    <div className="my-20 flex flex-col items-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <FeatureItem
          icon={<CreditScore sx={{ color: "white", fontSize: "32px" }} />}
          title="Quick and Professional Quote Generation"
          description="Easily formalize quotes with a professional template that enhances client trust."
        />
        <FeatureItem
          icon={<TableRows sx={{ color: "white", fontSize: "32px" }} />}
          title="Track and Manage Quotes"
          description="Keep track of sent, pending, accepted, and declined quotes in one place."
        />
        <FeatureItem
          icon={<Calculate sx={{ color: "white", fontSize: "32px" }} />}
          title="Save Time with Calculations"
          description="Reduce the time spent on manual quoting with automated calculations and templates."
        />
      </div>
    </div>
  );
};

export default Features;
