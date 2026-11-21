// Traces to: L2-020, L2-021, L2-022, L2-023, L2-024, L2-025
import { test, expect } from "../fixtures.ts";
import type { Reply } from "../fake-bluetooth/fake-config.ts";
import { F, STANDARD_INIT } from "../fake-bluetooth/frames.ts";

const LATENCY = 5;

/** The treadmill challenges once, 20 ms after the first A4. */
const challengeOnFirstA4 = (hex: string): Reply => ({ whenHexStartsWith: F.A4, once: true, notify: [{ char: "f3", hex, delayMs: 20 }] });
/** The treadmill acknowledges `delayMs` after the response write resolves. */
const ackAfter = (delayMs: number, hex: string = F.ACK_57): Reply => ({ whenHexStartsWith: "F0 E0 00 00", once: true, notify: [{ char: "f3", hex, delayMs }] });

async function eventRows(app: { log: { rowTexts(): Promise<string[]> } }): Promise<string[]> {
  return (await app.log.rowTexts()).filter((row) => / EV /.test(row)).map((row) => row.replace(/^\s*\d+\.\d EV /, ""));
}

test.describe("challenge and response", () => {
  test("L2-020, L2-021, L2-023: a valid challenge is answered within 50 ms and activated 500 ms later", async ({ app }) => {
    await app.open({ replies: [challengeOnFirstA4(F.CHALLENGE)] });
    await app.connection.connect();
    await app.advance(6_000);
    const snapshot = await app.fake.snapshot();
    const challengeAt = snapshot.notifications.find((n) => n.hex === F.CHALLENGE)?.t ?? Number.NaN;
    const response = snapshot.writes.find((w) => w.hex === F.RESPONSE_57);
    const activationWrite = snapshot.writes.find((w) => w.hex === F.ACTIVATION);
    expect(response).toBeDefined();
    expect((response?.t ?? 0) - challengeAt).toBeLessThanOrEqual(50);
    const sinceResolved = (activationWrite?.t ?? 0) - ((response?.t ?? 0) + LATENCY);
    expect(sinceResolved).toBeGreaterThanOrEqual(480);
    expect(sinceResolved).toBeLessThanOrEqual(520);

    const events = await eventRows(app);
    expect(events).toContain("Challenge F0 E0 34 12 05 78 97 2A");
    expect(events).toContain("Unlock values a=534 b=1278 c=97 auth=57");
    expect(events).toContain("Unlock response F0 E0 00 00 57 00 00 27");
    const rows = await app.log.rowTexts();
    expect(rows.some((row) => row.endsWith("TX f2 F0 E0 00 00 57 00 00 27 unlock response"))).toBe(true);
    expect(rows.some((row) => row.endsWith("TX f2 F0 B0 01 01 A2 activation"))).toBe(true);
  });

  test("L2-020: a challenge during init runs alongside init, which still completes", async ({ app }) => {
    await app.open({ replies: [challengeOnFirstA4(F.CHALLENGE)] });
    await app.connection.connect();
    await app.advance(6_000);
    const written = await app.fake.writtenHex();
    expect(written.filter((hex) => STANDARD_INIT.includes(hex as (typeof STANDARD_INIT)[number]))).toEqual(STANDARD_INIT);
    expect(written.indexOf(F.RESPONSE_57)).toBeLessThan(written.lastIndexOf(F.A3));
    expect(await eventRows(app)).toContain("Init complete");
    expect((await app.fake.snapshot()).overlaps).toBe(0);
  });

  test("L2-023: auth 0 is answered with F0 E0 00 00 00 00 00 D0", async ({ app }) => {
    await app.open({ replies: [challengeOnFirstA4("F0 E0 10 20 30 40 50 C0")] });
    await app.connection.connect();
    await app.advance(3_000);
    expect(await app.fake.writtenHex()).toContain("F0 E0 00 00 00 00 00 D0");
    expect(await eventRows(app)).toContain("Unlock values a=3010 b=2040 c=50 auth=0");
  });
});

test.describe("invalid challenges", () => {
  const cases = [
    { name: "bad checksum", hex: "F0 E0 34 12 05 78 97 2B", reason: "challenge checksum invalid" },
    { name: "7 bytes", hex: "F0 E0 34 12 05 78 2A", reason: "challenge length 7" },
    { name: "9 bytes", hex: "F0 E0 34 12 05 78 97 00 2A", reason: "challenge length 9" },
    { name: "zero divisor", hex: "F0 E0 34 12 05 78 00 93", reason: "zero divisor" },
    { name: "no decimal prefix in a", hex: "F0 E0 34 12 A5 78 97 CA", reason: "no decimal prefix in a" },
  ];
  for (const { name, hex, reason } of cases) {
    test(`L2-020, L2-022: ${name} ends locked with no response`, async ({ app }) => {
      await app.open({ replies: [challengeOnFirstA4(hex)] });
      await app.connection.connect();
      await app.advance(3_000);
      expect((await app.fake.writtenHex()).some((w) => w.startsWith("F0 E0"))).toBe(false);
      expect(await eventRows(app)).toContain(`Unlock attempt 1: locked, ${reason}`);
    });
  }
});

test.describe("acknowledgement window", () => {
  test("L2-024: an acknowledgement 2,400 ms after the response unlocks", async ({ app }) => {
    await app.open({ replies: [challengeOnFirstA4(F.CHALLENGE), ackAfter(2_400)] });
    await app.connection.connect();
    await app.advance(6_000);
    const events = await eventRows(app);
    expect(events).toContain("Acknowledged");
    expect(events).toContain("Unlock attempt 1: unlocked");
  });

  test("L2-024: no acknowledgement within 2,500 ms locks", async ({ app }) => {
    await app.open({ replies: [challengeOnFirstA4(F.CHALLENGE)] });
    await app.connection.connect();
    await app.advance(200);
    const response = (await app.fake.snapshot()).writes.find((w) => w.hex === F.RESPONSE_57);
    const resolvedAt = (response?.t ?? 0) + LATENCY;
    const now = await app.page.evaluate(() => performance.now());
    await app.advance(resolvedAt + 2_490 - now);
    expect(await eventRows(app)).not.toContain("Unlock attempt 1: locked, no acknowledgement within 2.5 s");
    await app.advance(20);
    expect(await eventRows(app)).toContain("Unlock attempt 1: locked, no acknowledgement within 2.5 s");
  });

  test("L2-024: a mismatching E0 keeps the window open and is not a new challenge", async ({ app }) => {
    await app.open({ replies: [challengeOnFirstA4(F.CHALLENGE), ackAfter(1_000, "F0 E0 00 00 56 00 00 26")] });
    await app.connection.connect();
    await app.advance(6_000);
    const events = await eventRows(app);
    expect(events).toContain("E0 does not match auth");
    expect(events).not.toContain("Unlock attempt 2");
    expect(events).toContain("Unlock attempt 1: locked, no acknowledgement within 2.5 s");
  });

  test("L2-024: an acknowledgement before the activation counts and the activation is still written", async ({ app }) => {
    await app.open({ replies: [challengeOnFirstA4(F.CHALLENGE), ackAfter(100)] });
    await app.connection.connect();
    await app.advance(6_000);
    expect(await eventRows(app)).toContain("Unlock attempt 1: unlocked");
    expect(await app.fake.writtenHex()).toContain(F.ACTIVATION);
  });
});

test.describe("repeated challenges", () => {
  test("L2-025: a new challenge after a locked attempt starts attempt 2", async ({ app }) => {
    await app.open({ replies: [challengeOnFirstA4(F.CHALLENGE)] });
    await app.connection.connect();
    await app.advance(4_000);
    expect(await eventRows(app)).toContain("Unlock attempt 1: locked, no acknowledgement within 2.5 s");
    await app.fake.notify("f4", F.CHALLENGE);
    await app.advance(100);
    await app.fake.notify("f4", F.ACK_57);
    await app.advance(1_000);
    const events = await eventRows(app);
    expect(events).toContain("Unlock attempt 2");
    expect(events).toContain("Unlock attempt 2: unlocked");
    expect((await app.fake.writtenHex()).filter((hex) => hex === F.RESPONSE_57)).toHaveLength(2);
  });
});
