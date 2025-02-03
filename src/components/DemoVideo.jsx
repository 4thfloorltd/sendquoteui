import React from "react";

const DemoVideo = () => {
  return (
    <div className="mt-5 max-w-5xl mx-auto animate-slideUp transition duration-500 delay-200">
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
    </div>
  );
};

export default DemoVideo;
