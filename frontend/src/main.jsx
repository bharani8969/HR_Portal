import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme.js";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import GlobalLoading from "./components/GlobalLoading.jsx";
import { SupportProvider } from "./components/SupportProvider.jsx";
import { applyBrand } from "./brand.js";
import "./styles.css";

applyBrand();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter><AuthProvider><SupportProvider><App /><GlobalLoading /></SupportProvider></AuthProvider></BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
