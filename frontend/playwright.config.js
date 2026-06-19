// playwright.config.js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e", // Playwright E2E test directory
  timeout: 30 * 1000,         // 30s per test
  retries: 1,                 // Retry once on failure (CI resilience)
  use: {
    headless: true,           // Run headless in CI; set false for local debugging
    baseURL: "http://localhost:3000",
    viewport: { width: 1300, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview",
    port: 3000,
    reuseExistingServer: true,
    timeout: 120 * 1000, // 2 minutes for build + start
  },
});
