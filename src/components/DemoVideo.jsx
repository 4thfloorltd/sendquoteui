import React from "react";
import { Box } from "@mui/material";

const DemoVideo = () => {
  return (
    <Box
      sx={{
        mt: 5,
        maxWidth: "100%",
        mx: "auto",
        animation: "slideUp 0.5s ease-in-out 0.2s",
        transition: "all 0.5s ease-in-out",
      }}
    >
      <iframe
        width="100%"
        height="590"
        src="https://www.youtube.com/embed/ZK-rNEhJIDs?controls=1"
        title="Demo Video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="rounded-lg shadow-lg"
      ></iframe>
    </Box>
  );
};

export default DemoVideo;
