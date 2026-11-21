// Traces to: L2-042
import { test, expect } from "../fixtures.ts";
import { F } from "../fake-bluetooth/frames.ts";
import { locked, silent, talks, unlocked, UNTIL_SILENT_MS, UNTIL_VERDICT_MS } from "../fake-bluetooth/scenarios.ts";
import type { StrideLinkPage } from "../page-objects/stride-link-page.ts";

async function tabReaches(app: StrideLinkPage, presses: number): Promise<string[]> {
  const names: string[] = [];
  for (let i = 0; i < presses; i += 1) {
    await app.page.keyboard.press("Tab");
    names.push(await app.page.evaluate(() => document.activeElement?.id ?? ""));
  }
  return names;
}

for (const [name, scenario] of [["Talks", talks], ["Unlocked", unlocked]] as const) {
  test(`L2-042: under ${name} an unticked gate is offered and the controls stay out of reach`, async ({ app }) => {
    await app.open(scenario);
    await app.connection.connect();
    await app.advance(UNTIL_VERDICT_MS);
    await expect(app.verdict.word).toHaveText(name);
    await expect(app.belt.gate).toBeVisible();
    await expect(app.belt.gate).not.toBeChecked();
    expect(await app.belt.controlsInAccessibilityTree()).toBe(false);
    const reached = await tabReaches(app, 30);
    for (const id of ["belt-start", "speed", "speed-apply", "incline", "incline-apply"]) expect(reached).not.toContain(id);
  });
}

test("L2-042: ticking the gate shows Start, speed and incline", async ({ app }) => {
  await app.open(talks);
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await app.belt.standClear();
  await expect(app.belt.startButton).toBeVisible();
  await expect(app.belt.speedInput).toBeVisible();
  await expect(app.belt.inclineInput).toBeVisible();
  expect(await app.belt.controlsInAccessibilityTree()).toBe(true);
  await app.settle();
  expect((await app.log.rowTexts()).some((row) => row.endsWith("EV Belt gate opened"))).toBe(true);
});

for (const [name, scenario, wait] of [["Silent", silent, UNTIL_SILENT_MS], ["Locked", locked, UNTIL_VERDICT_MS]] as const) {
  test(`L2-042: under ${name} neither the gate nor the controls are shown`, async ({ app }) => {
    await app.open(scenario);
    await app.connection.connect();
    await app.advance(wait);
    await expect(app.verdict.word).toHaveText(name);
    await expect(app.belt.gate).toHaveCount(0);
    await expect(app.belt.panel).toBeHidden();
    expect(await app.belt.controlsInAccessibilityTree()).toBe(false);
  });
}

test("L2-042: with no verdict yet neither the gate nor the controls are shown", async ({ app }) => {
  await app.open(talks);
  await app.connection.connect();
  await app.advance(1_000);
  await expect(app.verdict.card).toBeHidden();
  await expect(app.belt.gate).toHaveCount(0);
});

test("L2-042: a verdict that changes to Locked closes the gate", async ({ app }) => {
  await app.open(talks);
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await app.belt.standClear();
  await app.fake.notify("f3", F.CHALLENGE);
  await app.advance(3_000);
  await expect(app.verdict.word).toHaveText("Locked");
  await expect(app.belt.gate).toHaveCount(0);
  await expect(app.belt.startButton).toHaveCount(0);
});

test("L2-042: a new run starts with the gate unticked", async ({ app }) => {
  // Replies to every A4, so run 2 reaches Talks too.
  await app.open({ replies: [{ whenHexStartsWith: F.A4, notify: [{ char: "f4", hex: F.D3_ZERO, delayMs: 20 }] }] });
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await app.belt.standClear();
  await app.connection.disconnect();
  await app.settle();
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await expect(app.belt.gate).toBeVisible();
  await expect(app.belt.gate).not.toBeChecked();
  await expect(app.belt.startButton).toHaveCount(0);
});

test("L2-042: unticking while the belt is active hides the controls and keeps Stop", async ({ app }) => {
  await app.open(talks);
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await app.belt.standClear();
  await app.belt.start();
  await app.settle();
  await app.belt.gate.uncheck();
  await expect(app.belt.startButton).toHaveCount(0);
  await expect(app.belt.speedInput).toHaveCount(0);
  await expect(app.belt.inclineInput).toHaveCount(0);
  await expect(app.stop.button).toBeVisible();
});
