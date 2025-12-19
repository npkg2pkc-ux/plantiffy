import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Reset dark mode to light mode as default (one-time migration)
const resetDarkModeDefault = () => {
  const uiStorage = localStorage.getItem("ui-storage");
  if (uiStorage) {
    try {
      const parsed = JSON.parse(uiStorage);
      // If darkMode is true, reset to false (light mode as default)
      if (parsed.state?.darkMode === true) {
        parsed.state.darkMode = false;
        localStorage.setItem("ui-storage", JSON.stringify(parsed));
      }
    } catch (e) {
      // If parsing fails, remove the corrupted storage
      localStorage.removeItem("ui-storage");
    }
  }
  // Ensure no dark class on initial load
  document.documentElement.classList.remove("dark");
};

// Run once on app start
resetDarkModeDefault();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
