import "./App.css";
import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { ThemeProvider } from "@mui/material/styles";

import { initVatRates } from "./helpers/vatRates";
import { auth } from "../firebase";
import Layout from "./components/Layout";
import Landing from "./components/Landing";
import QuoteGenerator from "./routes/QuoteGenerator";
import { QuoteProvider } from "./context/QuoteContext";
import Register from "./routes/Register";
import Login from "./routes/Login";
import ForgotPassword from "./routes/ForgotPassword";
import ResetPassword from "./routes/ResetPassword";
import Dashboard from "./routes/secured/Dashboard";
import Quotes from "./routes/secured/quotes/Quotes";
import QuoteReview from "./routes/secured/quotes/QuoteReview";
import Settings from "./routes/secured/Settings";
import Billing from "./routes/secured/Billing";
import Support from "./routes/secured/Support";
import theme from "./theme";
import Pricing from "./routes/Pricing";
import QuoteView from "./routes/QuoteView";
import Privacy from "./routes/Privacy";
import Terms from "./routes/Terms";
import NotFound from "./routes/NotFound";

// Kick off the EU VAT rate fetch as early as possible; result is cached in
// memory and used by getDefaultVatPercent() throughout the app.
initVatRates();

function RootRedirect() {
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user);
      setChecked(true);
    });
    return unsub;
  }, []);

  if (!checked) return null;
  return loggedIn ? <Navigate to="/secured/quotes" replace /> : <Landing />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <RootRedirect /> },
      { path: "quote", element: <QuoteGenerator /> },
      { path: "quote/:quoteId", element: <QuoteView /> },
      { path: "pricing", element: <Pricing /> },
      { path: "privacy", element: <Privacy /> },
      { path: "terms", element: <Terms /> },
      { path: "register", element: <Register /> },
      { path: "login", element: <Login /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "secured/dashboard", element: <Dashboard /> },
      { path: "secured/quotes", element: <Quotes /> },
      { path: "secured/quote/:quoteId", element: <QuoteView /> },
      { path: "secured/quote", element: <QuoteGenerator /> },
      { path: "secured/quoteReview", element: <QuoteReview /> },
      { path: "secured/settings", element: <Settings /> },
      { path: "secured/billing", element: <Billing /> },
      { path: "secured/support", element: <Support /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <QuoteProvider>
        <RouterProvider router={router} />
      </QuoteProvider>
    </ThemeProvider>
  );
}

export default App;
