// Acceptance suite: Chromium only, against the fake navigator.bluetooth (L2-070).
// No project grants Bluetooth permission or reaches real hardware (L2-071).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "retain-on-failure",
    // Export file names use local time (L2-040); pin it so names are exact.
    timezoneId: "UTC",
    locale: "en-US",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
