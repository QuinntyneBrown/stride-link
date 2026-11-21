// Traces to: L2-045, L2-057
import { test, expect } from "../fixtures.ts";
import { F } from "../fake-bluetooth/frames.ts";
import { talks, UNTIL_VERDICT_MS } from "../fake-bluetooth/scenarios.ts";
import type { StrideLinkPage } from "../page-objects/stride-link-page.ts";

async function beltActive(app: StrideLinkPage): Promise<void> {
  await app.open(talks);
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await app.belt.standClear();
  await app.belt.start();
  await app.advance(100);
  await expect(app.stop.button).toBeVisible();
}

async function stopCount(app: StrideLinkPage): Promise<number> {
  return (await app.fake.writtenHex()).filter((hex) => hex === F.STOP).length;
}

test("L2-045: Stop is fully inside the viewport at every width from 320 to 1920 px and every scroll position", async ({ app }) => {
  await beltActive(app);
  for (const width of [320, 375, 414, 767, 768, 991, 992, 1199, 1200, 1440, 1920]) {
    for (const height of [568, 900]) {
      await app.resize(width, height);
      for (const fraction of [0, 0.5, 1]) {
        await app.scrollPageTo(fraction);
        const box = await app.stop.box();
        const viewport = await app.viewport();
        expect(box, `${width}x${height} at ${fraction}`).not.toBeNull();
        if (!box) continue;
        expect(box.x, `${width}x${height} at ${fraction}`).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
    }
  }
});

test("L2-045: Stop is reached by Tab from the top of the page", async ({ app }) => {
  await beltActive(app);
  expect(await app.stop.tabToStop()).not.toBeNull();
});

for (const key of ["Enter", " "] as const) {
  test(`L2-045: ${key === " " ? "Space" : key} on Stop sends the Stop command`, async ({ app }) => {
    await beltActive(app);
    await app.stop.pressKey(key);
    await app.advance(50);
    expect(await stopCount(app)).toBe(1);
  });
}

test("L2-045: Escape sends Stop from a text input and from the page body", async ({ app }) => {
  await beltActive(app);
  await app.belt.speedInput.focus();
  await app.stop.pressEscape();
  await app.advance(50);
  expect(await stopCount(app)).toBe(1);
  await app.belt.start();
  await app.advance(100);
  await app.page.locator("body").click({ position: { x: 5, y: 5 } });
  await app.stop.pressEscape();
  await app.advance(50);
  expect(await stopCount(app)).toBe(2);
});

test("L2-045: Escape does nothing while the belt is not active", async ({ app }) => {
  await app.open(talks);
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await app.stop.pressEscape();
  await app.advance(50);
  expect(await stopCount(app)).toBe(0);
});

test("L2-045: Stop is at least 64 x 64 CSS px and labelled Stop belt", async ({ app }) => {
  await beltActive(app);
  for (const width of [320, 1920]) {
    await app.resize(width, 800);
    const box = await app.stop.box();
    expect(box?.width).toBeGreaterThanOrEqual(64);
    expect(box?.height).toBeGreaterThanOrEqual(64);
  }
  await expect(app.stop.button).toHaveAccessibleName("Stop belt");
});

test("L2-045: a decoded speed above 0 without Start makes the belt active and shows Stop", async ({ app }) => {
  await app.open(talks);
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await expect(app.stop.button).toBeHidden();
  await app.fake.notify("f4", F.D3_3KMH);
  await expect(app.stop.button).toBeVisible();
});
