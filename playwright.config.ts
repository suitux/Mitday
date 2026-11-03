import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `${baseURL}/es`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: process.env.E2E_SERVER_LOGS ? "pipe" : "ignore",
    env: {
      AUTH_TEST_LOGIN: "1",
      AUTH_URL: baseURL,
      AUTH_TRUST_HOST: "true",
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
});
