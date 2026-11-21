// Traces to: L2-011, L2-015, L2-017, L2-018, L2-019, L2-056
import { test, expect } from "../fixtures.ts";
import { F, STANDARD_INIT, STRIDE4_INIT } from "../fake-bluetooth/frames.ts";

const LATENCY = 5;
/** Keepalives start 2 s after init complete; these specs look at init alone. */
const notKeepalive = (w: { hex: string }): boolean => !w.hex.startsWith("F0 A0 01");
const replyToInit = (delayMs: number) =>
  [F.A4, F.A1, F.A3, F.STRIDE4_E0].map((frame) => ({ whenHexStartsWith: frame, notify: [{ char: "f4" as const, hex: F.D3_ZERO, delayMs }] }));

test.describe("standard init sequence", () => {
  test("L2-017: seven frames in order, tagged init, after both subscriptions", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(5_000);
    expect((await app.fake.writtenHex()).filter((hex) => notKeepalive({ hex }))).toEqual(STANDARD_INIT);
    const calls = await app.fake.callNames();
    expect(calls.lastIndexOf("startNotifications")).toBeLessThan(calls.indexOf("writeValueWithResponse"));
    const rows = await app.log.rowTexts();
    const tx = rows.filter((row) => / TX f2 /.test(row) && !row.endsWith(" keepalive"));
    expect(tx).toHaveLength(7);
    for (const row of tx) expect(row).toMatch(/ init$/);
    expect(rows.some((row) => row.endsWith("EV Init complete"))).toBe(true);
  });

  test("L2-017: with no reply each write starts 300 ms after the previous one resolved", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(5_000);
    const writes = (await app.fake.snapshot()).writes.filter(notKeepalive);
    for (let i = 1; i < writes.length; i += 1) {
      const gap = (writes[i]?.t ?? 0) - ((writes[i - 1]?.t ?? 0) + LATENCY);
      expect(gap).toBeGreaterThanOrEqual(280);
      expect(gap).toBeLessThanOrEqual(320);
    }
  });

  test("L2-017: a reply 50 ms after each write advances the sequence within 20 ms", async ({ app }) => {
    await app.open({ replies: replyToInit(50) });
    await app.connection.connect();
    await app.advance(5_000);
    const snapshot = await app.fake.snapshot();
    const init = snapshot.writes.filter((w) => STANDARD_INIT.includes(w.hex as (typeof STANDARD_INIT)[number])).slice(0, 7);
    expect(init.map((w) => w.hex)).toEqual(STANDARD_INIT);
    for (let i = 1; i < init.length; i += 1) {
      const previous = init[i - 1]?.t ?? 0;
      const reply = snapshot.notifications.find((n) => n.t > previous);
      expect(reply).toBeDefined();
      const delay = (init[i]?.t ?? 0) - (reply?.t ?? 0);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(20);
    }
  });

  test("L2-019: a failed third write is logged and the sequence completes", async ({ app }) => {
    await app.open({ failWrites: [3] });
    await app.connection.connect();
    await app.advance(5_000);
    expect((await app.fake.writtenHex()).filter((hex) => notKeepalive({ hex }))).toEqual(STANDARD_INIT);
    const writes = (await app.fake.snapshot()).writes.filter(notKeepalive);
    const gap = (writes[3]?.t ?? 0) - ((writes[2]?.t ?? 0) + LATENCY);
    expect(gap).toBeGreaterThanOrEqual(280);
    expect(gap).toBeLessThanOrEqual(320);
    const rows = await app.log.rowTexts();
    expect(rows.some((row) => /TX f2 F0 A1 00 91 init write failed NetworkError: GATT operation failed for unknown reason\.$/.test(row))).toBe(true);
    expect(rows.some((row) => row.includes("EV Init complete"))).toBe(true);
  });

  test("L2-019: when every init write fails the run still moves on to the verdict", async ({ app }) => {
    await app.open({ failWrites: "all" });
    await app.connection.connect();
    await app.advance(5_000);
    await expect(app.status.text).toHaveText("Init sent. Waiting for the treadmill to answer…");
    expect((await app.log.rowTexts()).some((row) => row.endsWith("EV Init complete (7 of 7 writes failed)"))).toBe(true);
  });
});

test.describe("Stride 4 init sequence", () => {
  test("L2-018: nine frames in order with the same pacing, and its E0 is never a challenge", async ({ app }) => {
    await app.open({ deviceName: "STRIDE4-ABC" });
    await app.connection.connect();
    await app.advance(5_000);
    expect((await app.fake.writtenHex()).filter((hex) => notKeepalive({ hex }))).toEqual(STRIDE4_INIT);
    const writes = (await app.fake.snapshot()).writes.filter(notKeepalive);
    for (let i = 1; i < writes.length; i += 1) {
      const gap = (writes[i]?.t ?? 0) - ((writes[i - 1]?.t ?? 0) + LATENCY);
      expect(gap).toBeGreaterThanOrEqual(280);
      expect(gap).toBeLessThanOrEqual(320);
    }
    expect((await app.log.rowTexts()).some((row) => row.includes("Challenge"))).toBe(false);
  });
});

test.describe("write method and inbound edge cases", () => {
  test("L2-056: f2 without write uses writeValueWithoutResponse and logs it", async ({ app }) => {
    await app.open({ f2Write: false });
    await app.connection.connect();
    await app.advance(5_000);
    const methods = new Set((await app.fake.snapshot()).writes.map((w) => w.method));
    expect([...methods]).toEqual(["withoutResponse"]);
    expect((await app.log.rowTexts()).some((row) => row.endsWith("EV Write method: writeValueWithoutResponse"))).toBe(true);
  });

  test("L2-015: empty, unknown and malformed notifications are logged and processing continues", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.settle();
    await app.fake.notify("f3", "");
    await app.fake.notify("f3", "A0 D3 02 0B B8 88");
    await app.fake.notify("f4", "F0 D3 02 0B");
    await app.advance(5_000);
    const rows = await app.log.rowTexts();
    expect(rows.some((row) => row.endsWith("RX f3 (empty)"))).toBe(true);
    expect(rows.some((row) => row.endsWith("RX f3 A0 D3 02 0B B8 88 unknown"))).toBe(true);
    expect(rows.some((row) => row.endsWith("RX f4 F0 D3 02 0B malformed"))).toBe(true);
    expect(rows.some((row) => row.endsWith("EV Init complete"))).toBe(true);
  });
});
