import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

function App() {
  const [names, setNames] = useState([]);

  const fetchAPI = async () => {
    const response = await axios.get("http://localhost:8080/api");
    setNames(response.data.names);
    console.log(response.data.names);
  };

  useEffect(() => {
    fetchAPI();
  }, []);

  return (
    <>
      <h1>Client side application</h1>
      <strong>Hello!</strong>
      {names.map((name, index) => (
        <div key={index}>
          <p>{name}</p>
          <br />
        </div>
      ))}
    </>
  );
}

export default App;
