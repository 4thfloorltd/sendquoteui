import React, { useState } from "react";

const QuoteReview = () => {
  const [quote, setQuote] = useState({
    company: "ABC Corp",
    description: "This is a quote for services rendered.",
    amount: "$1,200",
  });

  const handleAccept = () => {
    alert("You have accepted the quote.");
    // Add logic to handle acceptance
  };

  const handleDecline = () => {
    alert("You have declined the quote.");
    // Add logic to handle decline
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Review Quote</h1>
      <div
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          borderRadius: "5px",
        }}
      >
        <h2>Company: {quote.company}</h2>
        <p>{quote.description}</p>
        <p>
          <strong>Amount:</strong> {quote.amount}
        </p>
      </div>
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={handleAccept}
          style={{
            padding: "10px 20px",
            marginRight: "10px",
            backgroundColor: "green",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Accept
        </button>
        <button
          onClick={handleDecline}
          style={{
            padding: "10px 20px",
            backgroundColor: "red",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Decline
        </button>
      </div>
    </div>
  );
};

export default QuoteReview;
