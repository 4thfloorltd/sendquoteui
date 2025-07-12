import React, { useRef, useState } from "react";
import { AppBar, Toolbar, IconButton, Typography, Badge } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCog, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, Link } from "react-router-dom"; // Ensure Link is imported
import NotificationModal from "./NotificationModal"; // Import the NotificationModal component

const TopNavigation = () => {
  const navigate = useNavigate();
  const bellRef = useRef(null); // Reference for the bell icon
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });
  const [open, setOpen] = useState(false);

  const latestQuotes = [
    {
      quoteId: "Q-100001",
      name: "John Doe",
      dateSent: "2025-05-24T14:30:00",
      status: "Accepted",
    },
    {
      quoteId: "Q-100002",
      name: "Charlie Carrick",
      dateSent: "2025-05-23T10:15:00",
      status: "Accepted",
    },
    {
      quoteId: "Q-100003",
      name: "John Smith",
      dateSent: "2025-05-22T16:45:00",
      status: "Declined",
    },
    {
      quoteId: "Q-100004",
      name: "Jane Smith",
      dateSent: "2025-05-21T09:00:00",
      status: "Pending",
    },
    {
      quoteId: "Q-100005",
      name: "Michael Brown",
      dateSent: "2025-05-20T14:00:00",
      status: "Declined",
    },
  ];

  // Example grouping logic for notifications (optional)
  const groupedNotifications = {
    Today: [
      "Quote <b>Q-100001</b> was <span style='color:green'>Accepted</span> by John Doe.",
      "Quote <b>Q-100002</b> was <span style='color:green'>Accepted</span> by Charlie Carrick.",
    ],
    Earlier: [
      "Quote <b>Q-100003</b> was <span style='color:red'>Declined</span> by John Smith.",
      "Quote <b>Q-100005</b> was <span style='color:red'>Declined</span> by Michael Brown.",
    ],
  };

  // Handle modal open/close
  const handleOpen = () => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setModalPosition({
        top: rect.bottom + window.scrollY + 10, // Position below the bell icon
        right: rect.right + window.scrollX - 400, // Center the modal (assuming modal width is ~300px)
      });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: "#083a6b" }}>
        {" "}
        {/* Updated background color */}
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          {" "}
          {/* Flexbox for proper alignment */}
          {/* Logo and Navigation to Home */}
          <Link to="/secured/dashboard" style={{ textDecoration: "none" }}>
            <Typography
              fontSize={18}
              fontWeight="bold"
              sx={{
                display: "flex",
                alignItems: "center",
                color: "#fff", // White color for better contrast
              }}
            >
              <FontAwesomeIcon
                icon={faPaperPlane}
                style={{ marginRight: "8px" }}
              />
              SendQuote
            </Typography>
          </Link>
          <Badge
            badgeContent={
              latestQuotes.filter(
                (quote) =>
                  quote.status === "Accepted" || quote.status === "Declined"
              ).length
            } // Number of notifications
            color="error" // Badge color
            overlap="circular" // Circular badge for the bell icon
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <IconButton
              color="inherit"
              sx={{ borderRadius: "50%", width: "32px", height: "32px" }}
              onClick={handleOpen} // Open modal on click
              aria-label="Notifications"
              ref={bellRef} // Attach the ref to the IconButton
            >
              <FontAwesomeIcon icon={faBell} style={{ color: "#fff" }} />{" "}
            </IconButton>
          </Badge>
        </Toolbar>
      </AppBar>
      <NotificationModal
        open={open}
        handleClose={handleClose}
        modalPosition={modalPosition}
        latestQuotes={latestQuotes}
        groupedNotifications={groupedNotifications}
      />
    </>
  );
};

export default TopNavigation;
