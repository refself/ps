import path from "node:path";

import { defineConfig } from "vite";
import type { PluginOption } from "vite";
import react from "@vitejs/plugin-react";

import { runReflowScript } from "./src/server/reflow-executor";

const executeScriptApi = (): PluginOption => ({
  name: "workflow-builder-execute-script-api",
  configureServer(server) {
    server.middlewares.use("/api/execute-script", (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
        return;
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("error", (error) => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })
        );
      });

      req.on("end", async () => {
        try {
          const payload = body.length > 0 ? JSON.parse(body) : {};
          const code = typeof payload.code === "string" ? payload.code : "";
          if (!code.trim()) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "Workflow code is required." }));
            return;
          }

          try {
            const result = await runReflowScript(code);
            res.statusCode = result.ok ? 200 : 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : String(error)
              })
            );
          }
        } catch (error) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : String(error)
            })
          );
        }
      });
    });
  }
});

export default defineConfig({
  plugins: [executeScriptApi(), react()],
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
