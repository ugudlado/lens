import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:37001",
      "/ws": {
        target: "ws://localhost:37001",
        ws: true,
        configure: (proxy) => {
          proxy.on("error", (err: NodeJS.ErrnoException) => {
            if (err.code === "ECONNRESET") {
              console.warn("ws proxy: client disconnected (ECONNRESET)");
              return;
            }
            console.error("ws proxy error:", err);
          });
        },
      },
    },
  },
});
