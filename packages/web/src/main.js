import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import "./index.css";
const container = document.getElementById("root");
if (!container) {
    throw new Error("Root element not found");
}
const root = createRoot(container);
root.render(_jsx(StrictMode, { children: _jsx(App, {}) }));
