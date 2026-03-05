import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    global: "globalThis",
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Polyfill Node.js built-ins for @lit-protocol/lit-node-client v7
    // (cross-fetch needs global, buffer, process, etc.)
    nodePolyfills({
      include: ["buffer", "process", "util", "stream", "events", "crypto"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
