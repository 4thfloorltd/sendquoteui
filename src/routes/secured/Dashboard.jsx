import React, { useRef, useState } from "react";
import {
  Badge,
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router-dom";
import {
  faBell,
  faCheckCircle,
  faClock,
  faFileInvoice,
  faTimes,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";

const Dashboard = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm")); // Detect xs screen size

  const metrics = [
    {
      title: "Total Quotes",
      value: 100,
      icon: faFileInvoice,
      color: "#083a6b",
      backgroundColor: "#F0F4F8",
    },
    {
      title: "Accepted",
      value: 80,
      icon: faCheckCircle,
      color: "#22C55E",
      backgroundColor: "#ECFDF5",
    },
    {
      title: "Pending",
      value: 15,
      icon: faClock,
      color: "#FBBF24",
      backgroundColor: "#FFFAF0",
    },
    {
      title: "Declined",
      value: 5,
      icon: faTimesCircle,
      color: "#EF4444",
      backgroundColor: "#FEF2F2",
    },
  ];

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
    {
      quoteId: "Q-100006",
      name: "Jack Lee",
      dateSent: "2025-05-19T11:30:00",
      status: "Declined",
    },
    {
      quoteId: "Q-100007",
      name: "Emily Davis",
      dateSent: "2025-05-18T08:45:00",
      status: "Accepted",
    },
    {
      quoteId: "Q-100008",
      name: "Sarah Johnson",
      dateSent: "2025-05-17T13:20:00",
      status: "Pending",
    },
  ];

  return (
    <Box>
      {/* Header Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            fontSize: { xs: "20px", sm: "24px" }, // Smaller font size on xs
          }}
        >
          Dashboard
        </Typography>
      </Box>

      {/* Metrics Section */}
      <Grid container spacing={3}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                backgroundColor: metric.backgroundColor,
                borderRadius: "16px",
                boxShadow: "0px 4px 12px rgba(0,0,0,0.04)",
                transition: "transform 0.2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0px 6px 16px rgba(0,0,0,0.08)",
                },
              }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "row", // Change to row to reduce height
                  alignItems: "center", // Align items vertically in the center
                  gap: 2, // Add spacing between elements
                  padding: { xs: 1, sm: 2 }, // Adjust padding for smaller screens
                }}
              >
                <Box
                  sx={{
                    backgroundColor: "#fff",
                    borderRadius: "50%",
                    width: { xs: 40, sm: 56 }, // Reduce size on xs screens
                    height: { xs: 40, sm: 56 }, // Reduce size on xs screens
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0px 2px 6px rgba(0,0,0,0.05)",
                  }}
                >
                  <FontAwesomeIcon
                    icon={metric.icon}
                    style={{
                      fontSize: { xs: "20px", sm: "24px" }, // Smaller icon size on xs screens
                      color: metric.color,
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column", // Keep text elements stacked
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#64748B",
                      fontWeight: 600,
                      fontSize: { xs: "12px", sm: "16px" }, // Smaller font size on xs screens
                    }}
                  >
                    {metric.title}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: "#083a6b",
                      fontSize: { xs: "16px", sm: "20px" }, // Smaller font size on xs screens
                    }}
                  >
                    {metric.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Latest Quotes Section */}
      <Box sx={{ mt: 4 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            mb: 3,
            fontSize: { xs: "16px", sm: "18px" }, // Smaller font size on xs
          }}
        >
          Latest Quotes
        </Typography>

        <TableContainer
          component={Paper}
          sx={{
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
            overflowX: "auto", // Enable horizontal scrolling on small screens
          }}
        >
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: "16px", // Add 16px border radius
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
              overflowX: "auto", // Enable horizontal scrolling on small screens
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "#083a6b",
                      backgroundColor: "#f8f8f8",
                      padding: { xs: "8px", sm: "16px" }, // Smaller padding on xs
                      fontSize: "14px", // Smaller font size on xs
                      width: "auto",
                    }}
                  >
                    Date
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "#083a6b",
                      backgroundColor: "#f8f8f8",
                      padding: { xs: "8px", sm: "16px" },
                      fontSize: "14px",
                    }}
                  >
                    Quote ID
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "#083a6b",
                      backgroundColor: "#f8f8f8",
                      padding: { xs: "8px", sm: "16px" },
                      fontSize: "14px",
                    }}
                  >
                    Name
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "#083a6b",
                      backgroundColor: "#f8f8f8",
                      padding: { xs: "8px", sm: "16px" },
                      fontSize: "14px",
                      textAlign: "center",
                    }}
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {latestQuotes.map((quote, index) => {
                  const metric = metrics.find(
                    (m) => m.title.toLowerCase() === quote.status.toLowerCase()
                  );

                  return (
                    <TableRow
                      key={index}
                      sx={{
                        "&:hover": {
                          backgroundColor: "#f1f1f1",
                          cursor: "pointer",
                        },
                        transition: "all 0.3s ease",
                        height: "56px", // Set a consistent row height
                      }}
                    >
                      <TableCell
                        sx={{
                          padding: { xs: "8px", sm: "16px" },
                          fontSize: "14px",
                          height: "56px", // Ensure consistent height
                        }}
                      >
                        {
                          isXs
                            ? new Date(quote.dateSent).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                }
                              ) // Short format for xs screens
                            : new Date(quote.dateSent).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              ) // Default format for larger screens
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: { xs: "8px", sm: "16px" },
                          fontSize: "14px",
                          whiteSpace: "nowrap",
                          height: "56px", // Ensure consistent height
                        }}
                      >
                        {quote.quoteId}
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: { xs: "8px", sm: "16px" },
                          fontSize: "14px",
                          height: "56px", // Ensure consistent height
                        }}
                      >
                        {quote.name}
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: { xs: "8px", sm: "16px" },
                          fontSize: "14px",
                          height: "56px", // Ensure consistent height
                          verticalAlign: "middle", // Align content vertically in the middle
                          borderBottom: "1px solid rgba(224, 224, 224, 1)", // Ensure consistent border
                        }}
                      >
                        {metric && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: {
                                xs: "center",
                                sm: "flex-start",
                                md: "flex-start",
                              },
                              gap: 1,
                            }}
                          >
                            <FontAwesomeIcon
                              icon={metric.icon}
                              style={{
                                fontSize: "16px",
                                color: metric.color,
                              }}
                            />
                            <Typography
                              sx={{
                                fontWeight: "bold",
                                color: metric ? metric.color : "#6B7280",
                                fontSize: "14px",
                                textTransform: "capitalize",
                                display: { xs: "none", sm: "block" }, // Hide text on xs screens
                              }}
                            >
                              {quote.status}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default Dashboard;
