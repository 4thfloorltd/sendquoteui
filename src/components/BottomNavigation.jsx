import React, { useState } from "react";
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
} from "@fortawesome/free-solid-svg-icons";

const BottomNav = () => {
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSupportClick = () => {
    window.location.href = "mailto:support@sendquote.app";
  };

  // Map routes to tab indices
  React.useEffect(() => {
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
          boxShadow: "0px -2px 4px rgba(0, 0, 0, 0.1)",
          zIndex: 1000,
          borderBottom: "1px solid #e5e7eb",
          rowGap: "4px",
        }}
      >
        <BottomNavigationAction
          label="Dashboard"
          component={Link}
          to="/secured/dashboard"
          icon={<FontAwesomeIcon icon={faTachometerAlt} />}
          sx={{
            color: "#6B7280",
            padding: "8px",
            minWidth: "auto",
            "&.Mui-selected": {
              color: "#083a6b",
            },
            rowGap: "4px",
          }}
        />
        <BottomNavigationAction
          label="Quotes"
          component={Link}
          to="/secured/quotes"
          icon={<FontAwesomeIcon icon={faPaperPlane} />}
          sx={{
            color: "#6B7280",
            padding: "8px",
            minWidth: "auto",
            "&.Mui-selected": {
              color: "#083a6b",
            },
            rowGap: "4px",
          }}
        />
        <BottomNavigationAction
          label="Settings"
          component={Link}
          to="/secured/settings"
          icon={<FontAwesomeIcon icon={faCog} />}
          sx={{
            color: "#6B7280",
            padding: "8px",
            minWidth: "auto",
            "&.Mui-selected": {
              color: "#083a6b",
            },
            rowGap: "4px",
          }}
        />
        <BottomNavigationAction
          label="Support"
          icon={<FontAwesomeIcon icon={faHeadphones} />}
          onClick={handleSupportClick}
          sx={{
            color: "#6B7280",
            padding: "8px",
            minWidth: "auto",
            "&:hover": {
              color: "#083a6b",
            },
            rowGap: "4px",
          }}
        />

        {false && (
          <BottomNavigationAction
            label="More"
            icon={<FontAwesomeIcon icon={faEllipsisH} />}
            onClick={handleMenuOpen}
            sx={{
              color: "#6B7280",
              padding: "8x",
              minWidth: "auto",
              "&.Mui-selected": {
                color: "#083a6b",
              },
            }}
          />
        )}
      </BottomNavigation>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{ zIndex: 1100 }}
      >
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
