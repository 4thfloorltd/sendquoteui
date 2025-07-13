import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import BottomNavigation from "./BottomNavigation";
import { Box } from "@mui/material";
import { useMediaQuery } from "@mui/material";
import TopNavigation from "./TopNavigation";

function Layout() {
  const location = useLocation();
  const isSecuredPath = location.pathname.startsWith("/secured");
  const isMobile = useMediaQuery("(max-width:768px)");

  function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
      window.scrollTo(0, 0);
    }, [pathname]);

    return null;
  }

  return (
    <>
      <ScrollToTop />

      {isSecuredPath ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column", // Stack Sidebar, Main Content, and Footer vertically
            minHeight: "100vh", // Full viewport height
          }}
        >
          {/* Top Navigation */}
          <TopNavigation />
          <Box
            style={{
              display: "flex",
              flex: 1, // Allow Sidebar and Main Content to grow and fill available space
              flexDirection: "row", // Sidebar and Main Content side by side
              overflow: "hidden", // Prevent overflow issues
            }}
          >
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                padding: "32px 16px 72px"
              }}
            >
              <Outlet />
            </Box>
          </Box>
        </div>
      ) : (
        <>
          <main
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: "100vh", // Ensure the footer is pushed to the bottom
            }}
          >
            <div style={{ flex: 1 }}>
              <Outlet />
            </div>
            <Footer />
          </main>
        </>
      )}

      {isSecuredPath && isMobile && <BottomNavigation />}
    </>
  );
}

export default Layout;
