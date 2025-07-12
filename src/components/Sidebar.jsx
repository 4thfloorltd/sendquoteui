import React from "react";
import { Drawer } from "@mui/material";
import { Box, List, ListItem, Typography, useMediaQuery } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faCog,
  faTachometerAlt,
  faPaperPlane,
  faHeadphones,
  faBell,
} from "@fortawesome/free-solid-svg-icons";

const Sidebar = () => {
  const isMobile = useMediaQuery("(max-width:768px)");
  const location = useLocation(); // Get the current route

  const menuItems = [
    { label: "Dashboard", icon: faTachometerAlt, path: "/secured/dashboard" },
    { label: "Quotes", icon: faPaperPlane, path: "/secured/quotes" },
    { label: "Settings", icon: faCog, path: "/secured/settings" },
  ];

  return (
    !isMobile && (
      <Drawer open variant="permanent">
        {/* Logo
        <Link to="/" tabIndex={-1} style={{ textDecoration: "none" }}>
          <Typography
            fontSize={24}
            fontWeight="bold"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#083a6b",
              padding: "16px 0",
            }}
          >
            <FontAwesomeIcon
              icon={faPaperPlane}
              style={{ marginRight: "8px" }}
            />
            SendQuote
          </Typography>
        </Link> */}

        {/* Sidebar Items */}
        <List sx={{ flexGrow: 1 }}>
          {/* Avatar with User Details */}
          <ListItem
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "16px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <img
              src="https://t4.ftcdn.net/jpg/02/19/63/31/360_F_219633151_BW6TD8D1EA9OqZu4JgdmeJGg4JBaiAHj.jpg"
              alt="User Avatar"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%", // Make the image circular
                objectFit: "cover", // Ensure the image fits within the circle
              }}
            />
            <Box>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: "700", // Bold font weight for the name
                  color: "#083a6b", // Dark blue color for the name
                }}
              >
                Noah Grey
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: "14px",
                  fontWeight: "500", // Medium font weight for the company name
                  color: "#6B7280", // Grey color for the company name
                }}
              >
                SendQuote Ltd
              </Typography>
            </Box>
          </ListItem>

          {/* Menu Items */}
          {menuItems.map((item) => (
            <Link
              to={item.path}
              key={item.label}
              style={{ textDecoration: "none" }}
            >
              <ListItem
                component="div" // Use "div" instead of "button" to avoid the warning
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  color: location.pathname === item.path ? "#fff" : "#6B7280", // White text for active item
                  backgroundColor:
                    location.pathname === item.path ? "#083a6b" : "inherit", // Active background color
                  "&:hover": {
                    backgroundColor: "#E5E7EB", // Hover effect for background
                    color: "#083a6b", // Change text color on hover
                    "& svg": {
                      color: "#083a6b", // Change SVG icon color on hover
                      fill: "#083a6b", // Ensure the fill color is also updated
                    },
                  },
                }}
              >
                <FontAwesomeIcon
                  icon={item.icon}
                  className="fa-icon"
                  style={{
                    fontSize: "20px",
                  }}
                />
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    marginLeft: "8px",
                  }}
                >
                  {item.label}
                </Typography>
              </ListItem>
            </Link>
          ))}
        </List>

        {/* Support */}
        <a
          href="mailto:support@sendquote.app"
          style={{ textDecoration: "none" }}
        >
          <ListItem
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "10px",
              padding: "10px 16px",
              color: "#6B7280", // Default grey color
              "&:hover": {
                backgroundColor: "#E5E7EB", // Hover effect
                color: "#083a6b", // Change text color on hover
                "& .fa-icon": {
                  color: "#083a6b", // Change icon color on hover
                },
              },
            }}
          >
            <FontAwesomeIcon
              icon={faHeadphones}
              className="fa-icon"
              style={{
                fontSize: "20px",
                color: "#6B7280", // Default grey color
              }}
            />
            <Typography
              variant="body1"
              sx={{
                fontSize: "16px",
                fontWeight: "bold",
                marginLeft: "8px",
              }}
            >
              Support
            </Typography>
          </ListItem>
        </a>
      </Drawer>
    )
  );
};

export default Sidebar;
