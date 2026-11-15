import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Same /api base path in dev and in the single-deployment demo.
      // FLAMELAB_API_PORT lets e2e point at its own hermetic backend.
      "/api": `http://localhost:${process.env.FLAMELAB_API_PORT ?? 8000}`,
    },
  },
  build: {
    rolldownOptions: {
      external: ['@fontsource/lato/400.css', '@fontsource/lato/700.css'],
    },
  },
});
