import path from "node:path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@workflow-builder/core": path.resolve(__dirname, "../core/src")
    }
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
    "process.env": "{}",
    process: "({ env: {} })"
  },
  server: {
    port: 5173
  }
});
