import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const envOr = (v: string | undefined, fallback: string) =>
  v?.trim() ? v : fallback;

const TARGET = (process.env.NEXT_E2E_TARGET ?? "staging").toLowerCase();
const LOCAL_E2E_BASE_URL = envOr(
  process.env.NEXT_PLAYWRIGHT_LOCAL_BASE_URL,
  "http://localhost:3000",
);
const BASE_URL = envOr(process.env.NEXT_PLAYWRIGHT_BASE_URL, LOCAL_E2E_BASE_URL);

const useLocal =
  TARGET === "local" || /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(BASE_URL);
const finalBaseURL = `${(useLocal ? LOCAL_E2E_BASE_URL : BASE_URL).replace(/\/+$/, "")}`;
const localE2ePort = new URL(LOCAL_E2E_BASE_URL).port || "3100";

console.log(`[e2e] target=${TARGET} baseURL=${finalBaseURL}`);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  use: {
    baseURL: finalBaseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  reporter: [
    ["list"],
    ["junit", { outputFile: "reports/junit/results.xml" }],
    ["html", { open: "never", outputFolder: "reports/html" }],
  ],

  // Keep CI lean; add more later if needed
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] } },
  ],

  ...(useLocal
    ? {
        webServer: {
          command: `npm run build && PORT=${localE2ePort} npm run start`,
          url: LOCAL_E2E_BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
