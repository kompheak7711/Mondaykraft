import { defineConfig } from "@playwright/test";

// Runs against the local dev server with the seed data (pnpm seed). Start `pnpm dev` first, or let the config start it.
export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  retries: 0,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", viewport: { width: 1280, height: 900 }, trace: "retain-on-failure" },
  webServer: { command: "pnpm dev --port 3000", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
