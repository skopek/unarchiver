import { inject } from "@vercel/analytics";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/app";

inject();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
