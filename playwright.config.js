import { defineConfig, devices } from "@playwright/test";

const scenario = process.env.LAB_SCENARIO || "baseline";
if (!["baseline", "auth", "weekend", "limit", "total", "all", "red"].includes(scenario)) {
  throw new Error("Unknown LAB_SCENARIO.");
}
const output = scenario === "baseline" ? "test-results" : "test-results/defects/" + scenario;
const html = scenario === "baseline" ? "playwright-report" : "defect-reports/" + scenario;

export default defineConfig({
  testDir: "./tests",
  metadata: { scenario, runId: process.env.LAB_RUN_ID || null },
  outputDir: output + "/artifacts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 3,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: html, open: "never" }],
    ["json", { outputFile: output + "/results.json" }],
    ["junit", { outputFile: output + "/junit.xml" }]
  ],
  use: {
    ...devices["Desktop Chrome"],
    channel: "chromium",
    locale: "en-US",
    timezoneId: "UTC",
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "api", testMatch: "api/**/*.spec.js" },
    { name: "e2e", testMatch: "e2e/**/*.spec.js" },
    { name: "db", testMatch: "db/**/*.spec.js" },
    { name: "security", testMatch: "security/**/*.spec.js" }
  ]
});
