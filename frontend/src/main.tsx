import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "@fontsource/lato/400.css";
import "@fontsource/lato/700.css";
import "./index.css";
import AppRoutes from "./routes.tsx";

// Hash routing: deep links keep working when the backend serves the built
// assets with no SPA fallback route.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  </StrictMode>,
);
