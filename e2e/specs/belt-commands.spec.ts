// Traces to: L2-043, L2-044, L2-046, L2-047
import { test, expect } from "../fixtures.ts";
import { F } from "../fake-bluetooth/frames.ts";
import type { FakeOverrides } from "../fake-bluetooth/install.ts";
import { talks, UNTIL_VERDICT_MS } from "../fake-bluetooth/scenarios.ts";
import type { StrideLinkPage } from "../page-objects/stride-link-page.ts";

const isBelt = (row: string): boolean => / belt$/.test(row);

async function gateOpen(app: StrideLinkPage, overrides: FakeOverrides = {}): Promise<void> {
  await app.open({ ...talks, ...overrides });
  await app.connection.connect();
  await app.advance(UNTIL_VERDICT_MS);
  await app.belt.standClear();
}

/** Frames written after the gate opened that are not keepalives. */
async function writtenSince(app: StrideLinkPage, count: number): Promise<string[]> {
  return (await app.fake.writtenHex()).slice(count).filter((hex) => !hex.startsWith("F0 A0 01"));
}

test.describe("Start", () => {
  test("L2-043: standard Start writes three frames in order, tagged belt, and the belt becomes active", async ({ app }) => {
    await gateOpen(app);
    const before = (await app.fake.writtenHex()).length;
    await app.belt.start();
    await app.advance(100);
    expect(await writtenSince(app, before)).toEqual(["F0 B0 01 01 A2", "F0 D0 01 00 C1", "F0 D0 01 11 D2"]);
    const rows = await app.log.rowTexts();
    expect(rows.filter(isBelt)).toHaveLength(3);
    expect(rows.some((row) => row.endsWith("EV Belt start requested"))).toBe(true);
    await expect(app.stop.button).toBeVisible();
  });

  test("L2-043: Stride 4 Start writes five frames in order", async ({ app }) => {
    await gateOpen(app, { deviceName: "STRIDE4-ABC" });
    const before = (await app.fake.writtenHex()).length;
    await app.belt.start();
    await app.advance(100);
    expect(await writtenSince(app, before)).toEqual(["F0 B0 01 01 A2", "F0 D0 01 00 C1", "F0 D0 01 11 D2", "F0 A5 00 95", "F0 D3 02 01 F4 BA"]);
  });
});

test.describe("Stop", () => {
  test("L2-044: with five writes queued, Stop is the next frame after the one in flight", async ({ app }) => {
    await gateOpen(app, { writeLatencyMs: 40 });
    await app.advance(100);
    const before = (await app.fake.writtenHex()).length;
    await app.belt.start();
    await app.belt.applySpeed("1.5");
    await app.belt.applyIncline("5");
    // Start's activation is in flight; four belt writes wait behind it, plus one more.
    await app.belt.applySpeed("2");
    await app.stop.press();
    await app.advance(1_000);
    const sent = await writtenSince(app, before);
    expect(sent[0]).toBe("F0 B0 01 01 A2");
    expect(sent[1]).toBe(F.STOP);
    expect(sent.slice(2)).toEqual(["F0 D0 01 00 C1", "F0 D0 01 11 D2", "F0 B2 02 05 DC 85", "F0 B1 01 05 A7", "F0 B2 02 07 D0 7B"]);
    expect((await app.fake.snapshot()).overlaps).toBe(0);
  });

  test("L2-044: once Stop resolves with no speed since, the belt is no longer active", async ({ app }) => {
    await gateOpen(app);
    await app.belt.start();
    await app.advance(100);
    await expect(app.stop.button).toBeVisible();
    await app.stop.press();
    await app.advance(100);
    await expect(app.stop.button).toBeHidden();
    const rows = await app.log.rowTexts();
    expect(rows.some((row) => row.endsWith("EV Belt stop requested"))).toBe(true);
    expect(rows.some((row) => row.endsWith(`TX f2 ${F.STOP} belt`))).toBe(true);
    expect(rows.some((row) => row.endsWith("EV Belt stop written"))).toBe(true);
  });

  test("L2-044: a speed above 0 reported after Stop keeps the belt active until it reports 0", async ({ app }) => {
    await gateOpen(app, { slowWrites: { prefix: F.STOP, latencyMs: 200 } });
    await app.belt.start();
    await app.advance(100);
    await app.stop.press();
    await app.advance(50);
    await app.fake.notify("f4", F.D3_3KMH);
    await app.advance(300);
    await expect(app.stop.button).toBeVisible();
    await app.fake.notify("f4", F.D3_ZERO);
    await expect(app.stop.button).toBeHidden();
  });

  test("L2-044: a rejected Stop shows the failure, keeps the belt active and Stop enabled", async ({ app }) => {
    await gateOpen(app, { failWritesStartingWith: F.STOP });
    await app.belt.start();
    await app.advance(100);
    await app.stop.press();
    await app.advance(100);
    await expect(app.stop.failed).toHaveText("Stop failed. Use the treadmill's stop button or safety key now.");
    await expect(app.stop.button).toBeVisible();
    await expect(app.stop.button).toBeEnabled();
    const rows = await app.log.rowTexts();
    expect(rows.some((row) => row.endsWith(`TX f2 ${F.STOP} belt write failed NetworkError: GATT operation failed for unknown reason.`))).toBe(true);
    await app.stop.press();
    await app.advance(100);
    expect((await app.fake.writtenHex()).filter((hex) => hex === F.STOP)).toHaveLength(2);
  });
});

test.describe("speed", () => {
  test("L2-046: 1.5 km/h writes F0 B2 02 05 DC 85, tagged belt", async ({ app }) => {
    await gateOpen(app);
    await app.belt.applySpeed("1.5");
    await app.advance(100);
    expect(await app.fake.writtenHex()).toContain("F0 B2 02 05 DC 85");
    expect((await app.log.rowTexts()).some((row) => row.endsWith("TX f2 F0 B2 02 05 DC 85 belt"))).toBe(true);
    await expect(app.belt.speedError).toBeHidden();
  });

  test("L2-046: 3.1 is refused with the cap message and nothing is written", async ({ app }) => {
    await gateOpen(app);
    const before = (await app.fake.writtenHex()).length;
    await app.belt.applySpeed("3.1");
    await app.advance(100);
    await expect(app.belt.speedError).toHaveText("Speed is capped at 3 km/h for the smoke test.");
    expect(await writtenSince(app, before)).toEqual([]);
  });

  for (const entry of ["-1", "", "abc"]) {
    test(`L2-046: ${JSON.stringify(entry)} is refused with the range message and nothing is written`, async ({ app }) => {
      await gateOpen(app);
      const before = (await app.fake.writtenHex()).length;
      await app.belt.applySpeed(entry);
      await app.advance(100);
      await expect(app.belt.speedError).toHaveText("Enter a speed from 0 to 3 km/h.");
      await expect(app.belt.speedInput).toHaveAttribute("aria-invalid", "true");
      expect(await writtenSince(app, before)).toEqual([]);
    });
  }

  test("L2-046: the speed control has min 0, max 3 and step 0.1", async ({ app }) => {
    await gateOpen(app);
    await expect(app.belt.speedInput).toHaveAttribute("min", "0");
    await expect(app.belt.speedInput).toHaveAttribute("max", "3");
    await expect(app.belt.speedInput).toHaveAttribute("step", "0.1");
  });
});

test.describe("incline", () => {
  test("L2-047: incline 5 writes F0 B1 01 05 A7, tagged belt", async ({ app }) => {
    await gateOpen(app);
    await app.belt.applyIncline("5");
    await app.advance(100);
    expect((await app.log.rowTexts()).some((row) => row.endsWith("TX f2 F0 B1 01 05 A7 belt"))).toBe(true);
  });

  for (const entry of ["16", "2.5", "-1"]) {
    test(`L2-047: ${entry} is refused and nothing is written`, async ({ app }) => {
      await gateOpen(app);
      const before = (await app.fake.writtenHex()).length;
      await app.belt.applyIncline(entry);
      await app.advance(100);
      await expect(app.belt.inclineError).toHaveText("Enter a whole-number incline from 0 to 15.");
      expect(await writtenSince(app, before)).toEqual([]);
    });
  }
});
