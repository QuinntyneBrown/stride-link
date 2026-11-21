// Traces to: L2-028, L2-029, L2-030, L2-031, L2-032
import { test, expect } from "../fixtures.ts";
import { F } from "../fake-bluetooth/frames.ts";
import type { StrideLinkPage } from "../page-objects/stride-link-page.ts";

async function connected(app: StrideLinkPage, deviceName = "STRIDE-8S"): Promise<void> {
  await app.open({ deviceName });
  await app.connection.connect();
  await app.advance(3_000);
}

async function hasRow(app: StrideLinkPage, suffix: string): Promise<boolean> {
  await app.settle();
  return (await app.log.rowTexts()).some((row) => row.endsWith(suffix));
}

test("L2-032: before any telemetry every value shows a dash", async ({ app }) => {
  await connected(app);
  await expect(app.telemetry.speed).toHaveText("—");
  await expect(app.telemetry.incline).toHaveText("—");
  await expect(app.telemetry.heartRate).toHaveText("—");
});

test("L2-028: D3 speed is shown as 3.00 km/h, then 0.00 km/h", async ({ app }) => {
  await connected(app);
  await app.fake.notify("f4", F.D3_3KMH);
  await expect(app.telemetry.speed).toHaveText("3.00 km/h");
  await app.fake.notify("f4", F.D3_ZERO);
  await expect(app.telemetry.speed).toHaveText("0.00 km/h");
});

test("L2-028: a 4-byte D3 does not update speed and is logged malformed", async ({ app }) => {
  await connected(app);
  await app.fake.notify("f4", F.D3_3KMH);
  await app.fake.notify("f4", "F0 D3 02 00");
  await expect(app.telemetry.speed).toHaveText("3.00 km/h");
  expect(await hasRow(app, "RX f4 F0 D3 02 00 malformed")).toBe(true);
});

test("L2-029, L2-031: a Stride 4 D1 gives 3.00 km/h and 72 bpm", async ({ app }) => {
  await connected(app, "STRIDE4-ABC");
  await app.fake.notify("f3", F.D1);
  await expect(app.telemetry.speed).toHaveText("3.00 km/h");
  await expect(app.telemetry.heartRate).toHaveText("72 bpm");
});

test("L2-029, L2-031: a standard D1 gives heart rate but not speed", async ({ app }) => {
  await connected(app);
  await app.fake.notify("f3", F.D1);
  await expect(app.telemetry.heartRate).toHaveText("72 bpm");
  await expect(app.telemetry.speed).toHaveText("—");
});

test("L2-031: byte 11 of 00 or an 11-byte D1 leaves heart rate unchanged", async ({ app }) => {
  await connected(app);
  await app.fake.notify("f3", "F0 D1 00 00 00 00 00 01 2C 00 00 00");
  await app.fake.notify("f3", "F0 D1 00 00 00 00 00 01 2C 00 00");
  await app.settle();
  await expect(app.telemetry.heartRate).toHaveText("—");
});

test("L2-030: D2 incline shows 5; a 3-byte D2 is malformed and leaves it", async ({ app }) => {
  await connected(app);
  await app.fake.notify("f3", F.D2_5);
  await expect(app.telemetry.incline).toHaveText("5");
  await app.fake.notify("f3", "F0 D2 01");
  await expect(app.telemetry.incline).toHaveText("5");
  expect(await hasRow(app, "RX f3 F0 D2 01 malformed")).toBe(true);
});

test("L2-032: values are kept for 60 s without updates and are not a live region", async ({ app }) => {
  await connected(app);
  await app.fake.notify("f4", F.D3_3KMH);
  await app.advance(60_000);
  await expect(app.telemetry.speed).toHaveText("3.00 km/h");
  await expect(app.telemetry.region).not.toHaveAttribute("aria-live", /.+/);
  await expect(app.telemetry.region.locator("[aria-live]")).toHaveCount(0);
});

test("L2-032: a decoded value is shown within 100 ms", async ({ app }) => {
  await connected(app);
  await app.fake.notify("f3", F.D2_5);
  // The clock is paused: anything shown now is shown within 0 ms of page time.
  await expect(app.telemetry.incline).toHaveText("5");
});

test("L2-032: a new run resets every value to a dash", async ({ app }) => {
  await connected(app);
  await app.fake.notify("f4", F.D3_3KMH);
  await app.fake.notify("f3", F.D2_5);
  await expect(app.telemetry.speed).toHaveText("3.00 km/h");
  await app.connection.disconnect();
  await app.settle();
  await app.connection.connect();
  await app.settle();
  await expect(app.telemetry.speed).toHaveText("—");
  await expect(app.telemetry.incline).toHaveText("—");
  await expect(app.telemetry.heartRate).toHaveText("—");
});
