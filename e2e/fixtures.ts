// Shared Playwright fixtures. Every test gets a guard that fails it on any page
// error, unhandled rejection, console error, or a call that reaches the real
// requestDevice (L2-003, L2-058, L2-070).
import { test as base, expect } from "@playwright/test";
import { StrideLinkPage } from "./page-objects/stride-link-page.ts";

interface Fixtures {
  app: StrideLinkPage;
  allowConsoleErrors: boolean;
  guard: undefined;
}

export const test = base.extend<Fixtures>({
  allowConsoleErrors: [false, { option: true }],
  app: async ({ page }, use) => {
    await use(new StrideLinkPage(page));
  },
  guard: [
    async ({ page, allowConsoleErrors }, use) => {
      const problems: string[] = [];
      page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error" && !allowConsoleErrors) problems.push(`console error: ${message.text()}`);
      });
      await use(undefined);
      const installed = await page
        .evaluate(() => typeof window.__fakeBluetooth === "object")
        .catch(() => false);
      if (installed) {
        const snapshot = await page.evaluate(() => window.__fakeBluetooth.snapshot());
        expect(snapshot.realRequestDeviceReached, "the real requestDevice was reached").toBe(false);
        expect(snapshot.unhandledRejections, "unhandled rejections").toEqual([]);
      }
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
