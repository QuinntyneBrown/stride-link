// Traces to: L2-001, L2-049, L2-050, L2-051, L2-052
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "../fixtures.ts";
import { locked, silent, talks, unlocked, UNTIL_SILENT_MS } from "../fake-bluetooth/scenarios.ts";
import { PAGE_URL, StrideLinkPage } from "../page-objects/stride-link-page.ts";

test("L2-001: the build leaves exactly one deliverable, stride-link.html, under 204,800 bytes", () => {
  const dist = join(process.cwd(), "dist");
  expect(readdirSync(dist)).toEqual(["stride-link.html"]);
  expect(statSync(join(dist, "stride-link.html")).size).toBeLessThan(204_800);
});

test("L2-001: with the network off the page renders with its own fonts and styles", async ({ app }) => {
  const blocked = await app.privacy.blockNetwork();
  await app.reach("talks");
  const rendering = await app.privacy.rendering();
  expect(rendering.failedFamilies).toEqual([]);
  expect(rendering.loadedFamilies).toContain("Inter Tight");
  expect(rendering.stylesApplied).toBe(true);
  await expect(app.verdict.word).toHaveText("Talks");
  expect(blocked).toEqual([]);
});

for (const [verdict, scenario] of [["Silent", silent], ["Talks", talks], ["Unlocked", unlocked], ["Locked", locked]] as const) {
  test(`L2-049: a run to ${verdict} and an export request only the page document`, async ({ app }) => {
    app.privacy.recordRequests();
    await app.open(scenario);
    await app.connection.connect();
    await app.advance(UNTIL_SILENT_MS);
    await expect(app.verdict.word).toHaveText(verdict);
    await app.log.exportLog();
    expect(app.privacy.requests()).toEqual([PAGE_URL]);
  });
}

test("L2-050: the CSP is the hashed policy, with no unsafe keywords", async ({ app }) => {
  await app.reach("idle");
  const { declared, recomputed } = await app.privacy.policies();
  expect(declared).toBe(recomputed);
  expect(declared).not.toMatch(/unsafe-inline|unsafe-eval/);
});

test.describe("an injected request", () => {
  // The browser reports the CSP violation on the console; that is the point here.
  test.use({ allowConsoleErrors: true });

  test("L2-050: an injected fetch is blocked and raises a securitypolicyviolation", async ({ app }) => {
    await app.reach("idle");
    const result = await app.privacy.tryFetch("https://example.com");
    expect(result).toEqual({ violatedDirective: "connect-src", rejected: true });
  });
});

test("L2-050: no element carries an inline style or on* handler in any busy state", async ({ app }) => {
  await app.reach("connection-lost");
  expect(await app.privacy.inlineAttributes()).toEqual([]);
});

test("L2-051: an error message of <b>bad</b> is shown as that exact text", async ({ app, page }) => {
  await app.open({ chooser: "NetworkError", chooserErrorMessage: "<b>bad</b>" });
  await app.connection.connect();
  await app.settle();
  expect((await app.log.rowTexts()).some((row) => row.endsWith("EV Chooser error NetworkError: <b>bad</b>"))).toBe(true);
  expect(await page.locator("#log b").count()).toBe(0);
  await expect(app.status.text).toHaveText("Couldn't open the Bluetooth chooser. Press Connect to try again.");
});

test("L2-052: after a full run and an export nothing is stored", async ({ app }) => {
  await app.reach("belt-active");
  await app.log.exportLog();
  await app.connection.disconnect();
  await app.advance(1_500);
  expect(await app.privacy.storage()).toEqual({ local: 0, session: 0, indexedDb: 0, caches: 0, cookie: "" });
});

test("L2-052: closing the tab and reopening the file starts with an empty log", async ({ app, context }) => {
  await app.reach("talks");
  await app.log.exportLog();
  await app.page.close();
  const reopened = new StrideLinkPage(await context.newPage());
  await reopened.reach("idle");
  await expect(reopened.log.count).toHaveText("0 entries");
  await expect(reopened.log.rows).toHaveCount(0);
});
