import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.MOBILE_TEST_URL || "http://localhost:5173"

export default defineConfig({
  testDir: ".",
  testMatch: "mobile.spec.ts",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "bun run dev",
    cwd: "../..",
    url: baseURL,
    reuseExistingServer: true,
  },
})
