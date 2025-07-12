import React, { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faTachometerAlt,
  faCog,
  faHeadphones,
  faEllipsisH,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";

const BottomNav = () => {
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(window.scrollY);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSupportClick = () => {
    window.location.href = "mailto:support@sendquote.app";
  };

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setVisible(false); // Hide when scrolling down
      } else {
        setVisible(true); // Show when scrolling up
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Map routes to tab indices
  useEffect(() => {
    if (location.pathname.startsWith("/secured/dashboard")) {
      setSelectedTab(0);
    } else if (location.pathname.startsWith("/secured/quotes")) {
      setSelectedTab(1);
    } else if (location.pathname.startsWith("/secured/settings")) {
      setSelectedTab(2);
    } else {
      setSelectedTab(false); // No tab selected
    }
  }, [location.pathname]);

  return (
    <>
      <BottomNavigation
        value={selectedTab}
        onChange={(_, newValue) => setSelectedTab(newValue)}
        showLabels
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          boxShadow: "0px -2px 4px rgba(0, 0, 0, 0.1)", // Add shadow for better visibility
          zIndex: 1000, // Ensure it stays above other elements
          borderBottom: "1px solid #e5e7eb", // Add a border for separation
          transform: visible ? "translateY(0)" : "translateY(100%)",
        }}
      >
        <BottomNavigationAction
          label="Dashboard"
          component={Link}
          to="/secured/dashboard"
          icon={<FontAwesomeIcon icon={faTachometerAlt} />}
          sx={{
            color: "#6B7280", // Default color
            padding: "4px 8px", // Reduce padding
            minWidth: "auto", // Reduce minimum width
            "&.Mui-selected": {
              color: "#083a6b", // Highlight color for selected tab
            },
          }}
        />
        <BottomNavigationAction
          label="Quotes"
          component={Link}
          to="/secured/quotes"
          icon={<FontAwesomeIcon icon={faPaperPlane} />}
          sx={{
            color: "#6B7280", // Default color
            padding: "4px 8px", // Reduce padding
            minWidth: "auto", // Reduce minimum width
            "&.Mui-selected": {
              color: "#083a6b", // Highlight color for selected tab
            },
          }}
        />
        <BottomNavigationAction
          label="Settings"
          component={Link}
          to="/secured/settings"
          icon={<FontAwesomeIcon icon={faCog} />}
          sx={{
            color: "#6B7280", // Default color
            padding: "4px 8px", // Reduce padding
            minWidth: "auto", // Reduce minimum width
            "&.Mui-selected": {
              color: "#083a6b", // Highlight color for selected tab
            },
          }}
        />
        <BottomNavigationAction
          label="Support"
          icon={<FontAwesomeIcon icon={faHeadphones} />}
          onClick={handleSupportClick} // Handle mailto link
          sx={{
            color: "#6B7280", // Default color
            padding: "4px 8px", // Reduce padding
            minWidth: "auto", // Reduce minimum width
            "&:hover": {
              color: "#083a6b", // Hover color
            },
          }}
        />

        {false && ( // Keep the "More" dropdown for future overflow scenarios
          <BottomNavigationAction
            label="More"
            icon={<FontAwesomeIcon icon={faEllipsisH} />}
            onClick={handleMenuOpen}
            sx={{
              color: "#6B7280",
              padding: "4px 8px", // Reduce padding
              minWidth: "auto", // Reduce minimum width
              "&.Mui-selected": {
                color: "#083a6b", // Highlight color for selected tab
              },
            }}
          />
        )}
      </BottomNavigation>

      {/* Dropdown Menu for Overflow Items */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{ zIndex: 1100 }}
      >
        {/* Add items here if needed in the future */}
        <MenuItem
          component={Link}
          onClick={handleMenuClose}
          sx={{ color: "#6B7280" }}
        >
          <FontAwesomeIcon icon={faHeadphones} style={{ marginRight: "8px" }} />
          Support
        </MenuItem>
      </Menu>
    </>
  );
};

export default BottomNav;
