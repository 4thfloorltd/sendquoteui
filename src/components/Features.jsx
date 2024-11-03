import React from "react";
import { Box, Typography } from "@mui/material";
import { CreditScore, TableRows, Calculate } from "@mui/icons-material";
import useInView from "../hooks/useInView";

export const FeatureItem = ({ icon, title, description, delay }) => {
  const isVisible = useInView({ rootClass: "feature-item" });

  return (
    <Box
      className={`feature-item p-2 flex flex-col items-center transition ${
        isVisible ? "animate-fade" : "opacity-0"
      }`}
      style={{ animationDelay: delay, transitionDelay: delay }}
    >
      <Box className="rounded-full bg-black p-3 w-12 h-auto flex items-center justify-center">
        {icon}
      </Box>
      <Typography variant="h6" className="text-lg font-light my-2">
        {title}
      </Typography>
      <Typography variant="body2" className="text-sm font-thin">
        {description}
      </Typography>
    </Box>
  );
};

const Features = () => {
  return (
    <div className="my-20">
      <div className="text-4xl text-center mb-10 font-thin">
        Why use Sendaquote?
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 w-[80vw] items-start text-center gap-10 justify-self-center">
        <FeatureItem
          icon={<CreditScore sx={{ color: "white" }} />}
          title="Quick and Professional Quote Generation"
          description="Easily formalize quotes with a professional template that enhances client trust."
          delay="0s"
        />
        <FeatureItem
          icon={<TableRows sx={{ color: "white" }} />}
          title="Track and Manage Quotes"
          description="Keep track of sent, pending, accepted, and declined quotes in one place, simplifying follow-ups and decision-making."
          delay="0.1s"
        />
        <FeatureItem
          icon={<Calculate sx={{ color: "white" }} />}
          title="Save time with calculations"
          description="Reduce the time spent on manual quoting with automated calculations and pre-built templates."
          delay="0.2s"
        />
      </div>
    </div>
  );
};

export default Features;
