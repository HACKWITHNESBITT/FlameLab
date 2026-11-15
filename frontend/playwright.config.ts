import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure", colorScheme: "dark" },
  webServer: [
    {
      command: ".venv/bin/python -m uvicorn backend.app:app --port 8000",
      cwd: "..",
      port: 8000,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run dev -- --port 5173 --strictPort",
      port: 5173,
      reuseExistingServer: true,
      timeout: 90_000,
    },
  ],
});
