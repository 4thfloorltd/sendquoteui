import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./components/Landing";

import Register from "./routes/Register";
import Login from "./routes/Login";

// secured routes
import Dashboard from "./routes/secured/Dashboard";
import Quotes from "./routes/secured/Quotes";
import QuoteReview from "./routes/secured/QuoteReview";
import Settings from "./routes/secured/Settings";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import Pricing from "./routes/Pricing";

function AppContent() {
  const [names, setNames] = useState([]);

  const fetchAPI = async () => {
    try {
      const response = await axios.get("http://localhost:8080/api");
      setNames(response.data.names);
      console.log(response.data.names);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchAPI();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="register" element={<Register />} />
          <Route path="login" element={<Login />} />
          <Route path="secured/dashboard" element={<Dashboard />} />
          <Route path="secured/quotes" element={<Quotes />} />
          <Route path="secured/quoteReview" element={<QuoteReview />} />
          <Route path="secured/settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
