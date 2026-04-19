import React, { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import Sidebar, { SIDEBAR_WIDTH } from "./Sidebar";
import Footer from "./Footer";
import BottomNavigation from "./BottomNavigation";
import { Box, CircularProgress } from "@mui/material";
import { useMediaQuery } from "@mui/material";
import TopNavigation from "./TopNavigation";
import PublicNavbar from "./PublicNavbar";
import { ScrollToTopFab } from "./ScrollToTopFab";
import { SecuredQuoteNavigationBlockerProvider } from "../context/SecuredQuoteNavigationBlocker";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteField, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { usePageSeo } from "../seo/usePageSeo";
import { useGoogleAnalytics } from "../analytics/useGoogleAnalytics";

function Layout() {
  const location = useLocation();
  usePageSeo(location.pathname);
  useGoogleAnalytics(location);
  const isSecuredPath = location.pathname.startsWith("/secured");
  const isQuoteViewPath = /^\/quote\/[^/]+/.test(location.pathname);
  const isAuthPath = ["/login", "/register", "/forgot-password", "/reset-password"].includes(location.pathname);
  const isMobile = useMediaQuery("(max-width:768px)");

  // null = still checking auth, false = signed out, true = signed in
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const loggedIn = !!user;
      setIsLoggedIn(loggedIn);
      setAuthChecked(true);

      if (!user || !user.email) return;

      // If a pendingEmailChange in Firestore matches the current Auth email,
      // the user just clicked their verification link — commit businessEmail +
      // loginEmail and clear the pending field.
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return;
        const data = snap.data();
        const pending = data.pendingEmailChange?.toLowerCase();
        if (pending && pending === user.email.toLowerCase()) {
          await setDoc(doc(db, "users", user.uid), {
            businessEmail:      user.email,
            loginEmail:         user.email,
            pendingEmailChange: deleteField(),
            updatedAt:          serverTimestamp(),
          }, { merge: true });
        }
      } catch (e) {
        console.error("Layout: email sync read failed (check Firestore rules — users/{userId} must allow read/write by UID only)", e);
        try {
          await updateDoc(doc(db, "users", user.uid), {
            businessEmail:      user.email,
            loginEmail:         user.email,
            pendingEmailChange: deleteField(),
            updatedAt:          serverTimestamp(),
          });
        } catch (e2) {
          console.error("Layout: fallback email sync write failed (check Firestore rules)", e2);
        }
      }
    });
    return unsub;
  }, []);

  function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
      window.scrollTo(0, 0);
    }, [pathname]);

    return null;
  }

  // While we are still resolving the auth state, show nothing to avoid a
  // flash of un-authenticated content on secured routes.
  if (!authChecked) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Redirect unauthenticated users away from secured routes (not logged in,
  // session expired, signed out elsewhere, or post–email-verification when
  // Firebase requires a fresh sign-in — not only the email-change flow).
  if (isSecuredPath && !isLoggedIn) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: { pathname: location.pathname, search: location.search },
          info: "Please sign in to access your account.",
        }}
      />
    );
  }

  return (
    <>
      <ScrollToTop />

      {/* One provider for the whole app shell so React Router only ever sees a single useBlocker. */}
      <SecuredQuoteNavigationBlockerProvider>
        {isSecuredPath ? (
          <>
            {/* Fixed top bar — sits above everything */}
            <TopNavigation />

            {/* Fixed sidebar */}
            <Sidebar />

            {/* Main content — sidebar offset on non-mobile */}
            <Box
              component="main"
              sx={{
                ml: { xs: 0, sm: 0, "@media (min-width:769px)": { marginLeft: `${SIDEBAR_WIDTH}px` } },
                minHeight: "100vh",
                padding: { xs: "86px 16px 80px" },
              }}
            >
              <Outlet />
            </Box>
          </>
        ) : (
          <>
            {/* Show TopNav + Sidebar on the quote view page for logged-in users */}
            {isQuoteViewPath && isLoggedIn && <TopNavigation />}
            {isQuoteViewPath && isLoggedIn && <Sidebar />}

            <main
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                marginLeft: isQuoteViewPath && isLoggedIn && !isMobile ? `${SIDEBAR_WIDTH}px` : 0,
              }}
            >
              {isAuthPath && <PublicNavbar />}
              <div style={{ flex: 1, paddingTop: isQuoteViewPath && isLoggedIn ? "calc(64px + env(safe-area-inset-top) + 28px)" : 0 }}>
                <Outlet />
              </div>
              {!isQuoteViewPath && <Footer />}
            </main>
          </>
        )}
      </SecuredQuoteNavigationBlockerProvider>

      {(isSecuredPath || (isQuoteViewPath && isLoggedIn)) && isMobile && <BottomNavigation />}

      {!isSecuredPath && <ScrollToTopFab bottom={(isQuoteViewPath && isLoggedIn) && isMobile ? 88 : 24} />}
    </>
  );
}

export default Layout;
