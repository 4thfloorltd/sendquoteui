import React from "react";
import { Box, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faReply, faThumbsUp } from "@fortawesome/free-solid-svg-icons";

export const FeatureItem = ({ icon, title, description }) => {
  return (
    <Box className="feature-item flex flex-row">
      {/* Icon Section */}
      <Box
        className="rounded-md bg-[#083a6b] p-4 flex mr-4"
        sx={{
          width: "48px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesomeIcon icon={icon} />
      </Box>
      {/* Title and Description Section */}
      <Box className="flex flex-col">
        <Typography
          variant="h6"
          className="text-lg"
          sx={{ color: "#333", fontWeight: "bold" }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          className="text-sm font-light"
          sx={{ color: "#666" }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
};

const Features = () => {
  return (
    <Box className="flex flex-col md:flex-row m-4 mb-24">
      <Box className="flex flex-col justify-around bg-blue-100 md:w-1/2 md:pr-4 p-8">
        <FeatureItem
          icon={<faUser sx={{ color: "white", fontSize: "24px" }} />}
          title="Customer Requests Quote"
          description="The customer submits a request for a quote, providing necessary details and requirements."
        />
        <FeatureItem
          icon={<faReply sx={{ color: "white", fontSize: "24px" }} />}
          title="Business Sends Quote"
          description="The business reviews the request and returns a professional quote to the customer."
        />
        <FeatureItem
          icon={<faThumbsUp sx={{ color: "white", fontSize: "24px" }} />}
          title="Customer Reviews Quote"
          description="The customer reviews the quote and accepts it, initiating the next steps in the process."
        />
      </Box>
    </Box>
  );
};

export default Features;
