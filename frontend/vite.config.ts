import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// VITE_BASE=/mani/ builds the copy served at akluxnails.com/mani; the default build ("/") still
// serves book.pmu-annakara.com.
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: "mani-slash-og-urls",
      transformIndexHtml: (html: string) =>
        base === "/" ? html : html.replaceAll("https://mani.akluxnails.com/", "https://akluxnails.com/mani/"),
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
