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
      // Public key only (no private key): the prompt shows, pushes are logged.
      NEXT_PUBLIC_VAPID_PUBLIC_KEY:
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
        "BDF4tXwhJN5Rz0J6CyIB-Iv8-WB8HyLEREQOQD5pZnVv2z2ctT6iveA6it5OGYhI8YE5Sa-bP7A71iPnmfewiE8",
    },
  },
});
