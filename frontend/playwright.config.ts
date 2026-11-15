import { defineConfig } from "@playwright/test";

// Hermetic ports (8002/5174): the suite never touches a developer's own
// dev servers, and the backend gets no provider key, so SI assertions are
// deterministic (si_unavailable) instead of depending on a live provider.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:5174", trace: "retain-on-failure", colorScheme: "dark" },
  webServer: [
    {
      command: ".venv/bin/python -m uvicorn backend.app:app --port 8002",
      cwd: "..",
      port: 8002,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...process.env, MODEL_API_KEY: "" },
    },
    {
      command: "npm run dev -- --port 5174 --strictPort",
      port: 5174,
      reuseExistingServer: false,
      timeout: 90_000,
      env: { ...process.env, FLAMELAB_API_PORT: "8002" },
    },
  ],
});
