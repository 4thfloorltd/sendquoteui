import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./components/Landing";
import Register from "./routes/Register";
import Login from "./routes/Login";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";

function App() {
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
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <div className="min-h-[100vh] min-w-[100vw] px-10">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Landing />} />
              <Route path="register" element={<Register />} />{" "}
              <Route path="login" element={<Login />} />
            </Route>
          </Routes>

          {/* API testing {names.length > 0 &&
            names.map((name, index) => (
              <div key={index}>
                <p>{name}</p>
                <br />
              </div>
            ))} */}
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
