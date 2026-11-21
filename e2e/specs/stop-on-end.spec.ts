// Traces to: L2-048
import { test, expect } from "../fixtures.ts";
import { F } from "../fake-bluetooth/frames.ts";
import type { FakeOverrides } from "../fake-bluetooth/install.ts";
import { talks, UNTIL_VERDICT_MS } from "../fake-bluetooth/scenarios.ts";
import type { StrideLinkPage } from "../page-objects/stride-link-page.ts";

const LOST = "Connection lost. If the belt is moving, use the treadmill's stop button or safety key.";

async function beltActive(app: StrideLinkPage, overrides: FakeOverrides = {}): Promise<void> {
  await app.open({ ...talks, ...overrides });
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await app.belt.standClear();
  await app.belt.start();
  await app.advance(100);
}

test("L2-048: Disconnect with the belt active writes Stop and disconnects once it resolves", async ({ app }) => {
  await beltActive(app, { slowWrites: { prefix: F.STOP, latencyMs: 300 } });
  await app.connection.disconnect();
  await app.advance(2_000);
  const snapshot = await app.fake.snapshot();
  const stop = snapshot.writes.find((w) => w.hex === F.STOP);
  const disconnect = snapshot.calls.find((c) => c.name === "gatt.disconnect");
  expect(stop).toBeDefined();
  expect(disconnect).toBeDefined();
  const after = (disconnect?.t ?? 0) - ((stop?.t ?? 0) + 300);
  expect(after).toBeGreaterThanOrEqual(0);
  expect(after).toBeLessThanOrEqual(20);
});

test("L2-048: a Stop that never resolves delays the disconnect by 1,000 ms at most", async ({ app }) => {
  await beltActive(app, { slowWrites: { prefix: F.STOP, latencyMs: 60_000 } });
  await app.connection.disconnect();
  await app.advance(1_500);
  const snapshot = await app.fake.snapshot();
  const stop = snapshot.writes.find((w) => w.hex === F.STOP);
  const disconnect = snapshot.calls.find((c) => c.name === "gatt.disconnect");
  expect(disconnect).toBeDefined();
  const waited = (disconnect?.t ?? 0) - (stop?.t ?? 0);
  expect(waited).toBeGreaterThanOrEqual(980);
  expect(waited).toBeLessThanOrEqual(1_020);
  await expect(app.stop.connectionLost).toBeHidden();
});

test("L2-048: pagehide with the belt active puts Stop at the front of the queue", async ({ app }) => {
  await beltActive(app, { writeLatencyMs: 40 });
  await app.advance(500);
  const before = (await app.fake.writtenHex()).length;
  await app.belt.applySpeed("1");
  await app.belt.applyIncline("2");
  await app.belt.applySpeed("2");
  await app.stop.firePagehide();
  await app.advance(500);
  const sent = (await app.fake.writtenHex()).slice(before).filter((hex) => !hex.startsWith("F0 A0 01"));
  expect(sent[1]).toBe(F.STOP);
});

test("L2-048: losing the connection with the belt active shows the banner until dismissed", async ({ app }) => {
  await beltActive(app);
  await app.fake.dropConnection();
  await expect(app.stop.connectionLost).toBeVisible();
  await expect(app.stop.connectionLost).toHaveText(new RegExp(LOST.replace(/[.']/g, "\\$&")));
  await app.advance(60_000);
  await expect(app.stop.connectionLost).toBeVisible();
  await app.stop.dismissConnectionLost.click();
  await expect(app.stop.connectionLost).toBeHidden();
  await expect(app.connection.connectButton).toBeFocused();
});

test("L2-048: losing the connection with the belt idle shows no banner", async ({ app }) => {
  await app.open(talks);
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await app.fake.dropConnection();
  await app.settle();
  await expect(app.stop.connectionLost).toBeHidden();
});
