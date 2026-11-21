// Traces to: L2-026, L2-027, L2-055, L2-056
import { test, expect } from "../fixtures.ts";
import { F, STANDARD_INIT } from "../fake-bluetooth/frames.ts";
import type { FakeSnapshot } from "../fake-bluetooth/fake-config.ts";

const LATENCY = 5;
const isKeepalive = (hex: string): boolean => hex.startsWith("F0 A0 01");

function initCompleteAt(snapshot: FakeSnapshot): number {
  const init = snapshot.writes.filter((w) => STANDARD_INIT.includes(w.hex as (typeof STANDARD_INIT)[number]));
  return (init[STANDARD_INIT.length - 1]?.t ?? Number.NaN) + LATENCY;
}

test.describe("counting keepalive", () => {
  test("L2-026: the first keepalive is F0 A0 01 01 92, 2,000 ms after init complete, and none before", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(5_000);
    const snapshot = await app.fake.snapshot();
    const done = initCompleteAt(snapshot);
    const keepalives = snapshot.writes.filter((w) => isKeepalive(w.hex));
    expect(keepalives[0]?.hex).toBe("F0 A0 01 01 92");
    expect(Math.abs((keepalives[0]?.t ?? 0) - (done + 2_000))).toBeLessThanOrEqual(50);
    expect(snapshot.writes.filter((w) => w.t < done && isKeepalive(w.hex))).toEqual([]);
    expect((await app.log.rowTexts()).some((row) => row.endsWith("TX f2 F0 A0 01 01 92 keepalive"))).toBe(true);
  });

  test("L2-026: the counter counts to 255, wraps to 1 and is never 0", async ({ app }) => {
    test.slow();
    await app.open();
    await app.connection.connect();
    await app.advance(2_500 + 256 * 2_000);
    const keepalives = (await app.fake.snapshot()).writes.filter((w) => isKeepalive(w.hex));
    expect(keepalives.length).toBeGreaterThanOrEqual(256);
    expect(keepalives[254]?.hex).toBe("F0 A0 01 FF 90");
    expect(keepalives[255]?.hex).toBe("F0 A0 01 01 92");
    expect(keepalives.some((w) => w.hex.startsWith("F0 A0 01 00"))).toBe(false);
    // Scheduled against target times: no drift after 256 ticks.
    const first = keepalives[0]?.t ?? 0;
    expect(Math.abs((keepalives[255]?.t ?? 0) - (first + 255 * 2_000))).toBeLessThanOrEqual(50);
  });

  test("L2-026: no keepalive is written after a disconnection", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(7_000);
    await app.fake.dropConnection();
    const before = (await app.fake.writtenHex()).filter(isKeepalive).length;
    await app.advance(10_000);
    expect((await app.fake.writtenHex()).filter(isKeepalive)).toHaveLength(before);
  });
});

test.describe("echo replies", () => {
  test("L2-027: D3, D2 and D0 are echoed byte for byte within 50 ms, tagged echo", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(3_000);
    for (const hex of [F.D3_3KMH, F.D2_5, F.D0, "F0 D3 02 0B B8 00"]) {
      await app.fake.notify("f4", hex);
      await app.advance(60);
    }
    const snapshot = await app.fake.snapshot();
    for (const hex of [F.D3_3KMH, F.D2_5, F.D0, "F0 D3 02 0B B8 00"]) {
      const received = snapshot.notifications.find((n) => n.hex === hex);
      const echoed = snapshot.writes.find((w) => w.hex === hex);
      expect(echoed, hex).toBeDefined();
      expect((echoed?.t ?? 0) - (received?.t ?? 0)).toBeLessThanOrEqual(50);
    }
    await app.settle();
    expect((await app.log.rowTexts()).some((row) => row.endsWith(`TX f2 ${F.D3_3KMH} echo`))).toBe(true);
  });

  test("L2-027: D1, E0 and unknown frames are not echoed", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(3_000);
    for (const hex of [F.D1, "F0 E0 00 00 56 00 00 26", "A0 D3 02 0B B8 88"]) await app.fake.notify("f3", hex);
    await app.advance(100);
    const written = await app.fake.writtenHex();
    for (const hex of [F.D1, "F0 E0 00 00 56 00 00 26", "A0 D3 02 0B B8 88"]) expect(written).not.toContain(hex);
  });

  test("L2-027: a late D3 is still echoed long after the verdict window", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(25_000);
    await app.fake.notify("f3", F.D3_3KMH);
    await app.advance(50);
    expect(await app.fake.writtenHex()).toContain(F.D3_3KMH);
  });
});

test.describe("latency and serialisation", () => {
  test("L2-055: at 20 notifications per second for 60 s, p95 handling is under 10 ms and no echo is dropped", async ({ app }) => {
    test.slow();
    await app.open();
    await app.connection.connect();
    await app.advance(3_000);
    await app.fake.notifyEvery("f4", F.D3_3KMH, 50, 1_200);
    await app.advance(61_000);
    const snapshot = await app.fake.snapshot();
    const sent = snapshot.notifications.filter((n) => n.hex === F.D3_3KMH);
    expect(sent).toHaveLength(1_200);
    expect(snapshot.writes.filter((w) => w.hex === F.D3_3KMH && w.ok)).toHaveLength(1_200);
    const sorted = [...snapshot.handlerMs].sort((a, b) => a - b);
    expect(sorted.reduce((sum, ms) => sum + ms, 0)).toBeGreaterThan(0);
    expect(sorted[Math.floor(sorted.length * 0.95)] ?? Infinity).toBeLessThan(10);
  });

  test("L2-056: a full run with init, unlock, echoes and keepalives never overlaps writes", async ({ app }) => {
    await app.open({
      replies: [
        { whenHexStartsWith: F.A4, once: true, notify: [{ char: "f3", hex: F.CHALLENGE, delayMs: 1 }] },
        { whenHexStartsWith: "F0 E0 00 00", once: true, notify: [{ char: "f3", hex: F.ACK_57, delayMs: 300 }] },
        { whenHexStartsWith: "F0 A1", notify: [{ char: "f4", hex: F.D3_ZERO, delayMs: 1 }, { char: "f3", hex: F.D2_5, delayMs: 2 }] },
        { whenHexStartsWith: "F0 A0", notify: [{ char: "f4", hex: F.D0, delayMs: 0 }] },
      ],
      writeLatencyMs: 15,
    });
    await app.connection.connect();
    await app.advance(20_000);
    const snapshot = await app.fake.snapshot();
    expect(snapshot.overlaps).toBe(0);
    expect(snapshot.writes.filter((w) => isKeepalive(w.hex)).length).toBeGreaterThan(5);
    expect(snapshot.writes.some((w) => w.hex === F.RESPONSE_57)).toBe(true);
    await app.settle();
    expect((await app.log.rowTexts()).some((row) => row.includes("already in progress"))).toBe(false);
  });
});
