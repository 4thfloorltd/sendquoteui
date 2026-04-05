import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { initVatRates } from "./helpers/vatRates";

// Kick off the EU VAT rate fetch as early as possible; result is cached in
// memory and used by getDefaultVatPercent() throughout the app.
initVatRates();
import Layout from "./components/Layout";
import Landing from "./components/Landing";
import QuoteGenerator from "./routes/QuoteGenerator";
import { QuoteProvider } from "./context/QuoteContext";
import Register from "./routes/Register";
import Login from "./routes/Login";
import Dashboard from "./routes/secured/Dashboard";
import Quotes from "./routes/secured/quotes/Quotes";
import QuoteReview from "./routes/secured/quotes/QuoteReview";
import Settings from "./routes/secured/Settings";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import Pricing from "./routes/Pricing";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      { path: "quote", element: <QuoteGenerator /> },
      { path: "pricing", element: <Pricing /> },
      { path: "register", element: <Register /> },
      { path: "login", element: <Login /> },
      { path: "secured/dashboard", element: <Dashboard /> },
      { path: "secured/quotes", element: <Quotes /> },
      { path: "secured/quoteReview", element: <QuoteReview /> },
      { path: "secured/settings", element: <Settings /> },
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
