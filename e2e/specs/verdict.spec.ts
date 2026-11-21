// Traces to: L2-025, L2-033, L2-034, L2-035, L2-036
import { test, expect } from "../fixtures.ts";
import type { Reply } from "../fake-bluetooth/fake-config.ts";
import { F, STANDARD_INIT } from "../fake-bluetooth/frames.ts";
import type { StrideLinkPage } from "../page-objects/stride-link-page.ts";

const LATENCY = 5;
const replyOnFirstA4 = (hex: string): Reply => ({ whenHexStartsWith: F.A4, once: true, notify: [{ char: "f4", hex, delayMs: 20 }] });

/** Connects and runs until init completes; returns that moment on the page clock. */
async function runInit(app: StrideLinkPage): Promise<number> {
  await app.connection.connect();
  await app.advance(3_000);
  const writes = (await app.fake.snapshot()).writes.filter((w) => STANDARD_INIT.includes(w.hex as (typeof STANDARD_INIT)[number]));
  expect(writes).toHaveLength(STANDARD_INIT.length);
  return (writes[STANDARD_INIT.length - 1]?.t ?? Number.NaN) + LATENCY;
}

async function events(app: StrideLinkPage): Promise<string[]> {
  await app.settle();
  return (await app.log.rowTexts()).filter((row) => / EV /.test(row)).map((row) => row.replace(/^\s*\d+\.\d EV /, ""));
}

test.describe("Silent", () => {
  test("L2-033: no verdict at 19,900 ms and Silent at 20,000 ms after init complete", async ({ app }) => {
    await app.open();
    const done = await runInit(app);
    await app.advanceTo(done + 19_900);
    await expect(app.verdict.card).toBeHidden();
    await app.advanceTo(done + 20_050);
    await expect(app.verdict.word).toHaveText("Silent");
    await expect(app.verdict.reason).toHaveText("no notification within 20 s of init");
  });

  test("L2-033: Silent is final; a late D3 is logged and echoed", async ({ app }) => {
    await app.open();
    const done = await runInit(app);
    await app.advanceTo(done + 20_100);
    await app.fake.notify("f4", F.D3_3KMH);
    await app.fake.notify("f3", F.CHALLENGE);
    await app.advance(3_000);
    await expect(app.verdict.word).toHaveText("Silent");
    expect(await app.fake.writtenHex()).toContain(F.D3_3KMH);
    expect((await app.log.rowTexts()).some((row) => row.endsWith(`RX f4 ${F.D3_3KMH}`))).toBe(true);
  });
});

test.describe("Talks", () => {
  test("L2-034: a D3 during init and no E0 gives Talks 3,000 ms after init complete", async ({ app }) => {
    await app.open({ replies: [replyOnFirstA4(F.D3_ZERO)] });
    const done = await runInit(app);
    await app.advanceTo(done + 2_950);
    await expect(app.verdict.card).toBeHidden();
    await app.advanceTo(done + 3_050);
    await expect(app.verdict.word).toHaveText("Talks");
    await expect(app.verdict.reason).toBeHidden();
  });

  test("L2-034: a first D2 8,000 ms after init complete gives Talks at once", async ({ app }) => {
    await app.open();
    const done = await runInit(app);
    await app.advanceTo(done + 8_000);
    await expect(app.verdict.card).toBeHidden();
    await app.fake.notify("f3", F.D2_5);
    await expect(app.verdict.word).toHaveText("Talks");
  });

  test("L2-034: a challenge 1,000 ms after init complete stops Talks; the unlock flow decides", async ({ app }) => {
    await app.open({ replies: [replyOnFirstA4(F.D3_ZERO)] });
    const done = await runInit(app);
    await app.advanceTo(done + 1_000);
    await app.fake.notify("f3", F.CHALLENGE);
    await app.advanceTo(done + 3_100);
    await expect(app.verdict.card).toBeHidden();
    await app.advance(1_000);
    await expect(app.verdict.word).toHaveText("Locked");
    expect(await events(app)).not.toContain("Verdict: Talks");
  });

  test("L2-034: a challenge after Talks replaces it and logs the change", async ({ app }) => {
    await app.open({ replies: [replyOnFirstA4(F.D3_ZERO)] });
    const done = await runInit(app);
    await app.advanceTo(done + 3_100);
    await expect(app.verdict.word).toHaveText("Talks");
    await app.fake.notify("f3", F.CHALLENGE);
    await app.advance(100);
    await app.fake.notify("f3", F.ACK_57);
    await expect(app.verdict.word).toHaveText("Unlocked");
    expect(await events(app)).toContain("Verdict changed: talks -> unlocked");
  });
});

test.describe("repeated unlock attempts", () => {
  test("L2-025: attempt 2 acknowledged changes Locked to Unlocked", async ({ app }) => {
    await app.open({ replies: [{ whenHexStartsWith: F.A4, once: true, notify: [{ char: "f3", hex: F.CHALLENGE, delayMs: 20 }] }] });
    await app.connection.connect();
    await app.advance(5_000);
    await expect(app.verdict.word).toHaveText("Locked");
    await app.fake.notify("f3", F.CHALLENGE);
    await app.advance(100);
    await app.fake.notify("f3", F.ACK_57);
    await expect(app.verdict.word).toHaveText("Unlocked");
    expect(await events(app)).toContain("Verdict changed: locked -> unlocked");
  });
});

test.describe("disconnection before a verdict", () => {
  test("L2-035: with no notification it is Silent, disconnected before any reply", async ({ app }) => {
    await app.open();
    await runInit(app);
    await app.fake.dropConnection();
    await expect(app.verdict.word).toHaveText("Silent");
    await expect(app.verdict.reason).toHaveText("disconnected before any reply");
  });

  test("L2-035: during init with no notification it is Silent", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(400);
    await app.fake.dropConnection();
    await expect(app.verdict.word).toHaveText("Silent");
    await expect(app.verdict.reason).toHaveText("disconnected before any reply");
  });

  test("L2-035: with notifications and no challenge it is Talks", async ({ app }) => {
    await app.open({ replies: [replyOnFirstA4(F.D3_ZERO)] });
    await runInit(app);
    await app.fake.dropConnection();
    await expect(app.verdict.word).toHaveText("Talks");
  });

  test("L2-035: while an acknowledgement is awaited it is Locked", async ({ app }) => {
    await app.open({ replies: [{ whenHexStartsWith: F.A4, once: true, notify: [{ char: "f3", hex: F.CHALLENGE, delayMs: 20 }] }] });
    await app.connection.connect();
    await app.advance(500);
    await app.fake.dropConnection();
    await expect(app.verdict.word).toHaveText("Locked");
    await expect(app.verdict.reason).toHaveText("disconnected before acknowledgement");
  });

  test("L2-035: a verdict already reached is unchanged", async ({ app }) => {
    await app.open({ replies: [replyOnFirstA4(F.D3_ZERO)] });
    const done = await runInit(app);
    await app.advanceTo(done + 3_100);
    await expect(app.verdict.word).toHaveText("Talks");
    await app.fake.dropConnection();
    await app.settle();
    await expect(app.verdict.word).toHaveText("Talks");
    expect((await events(app)).filter((line) => line.startsWith("Verdict"))).toEqual(["Verdict: Talks"]);
  });

  test("L2-035: a failure before init gives no verdict", async ({ app }) => {
    await app.open({ service: false });
    await app.connection.connect();
    await app.advance(1_000);
    await expect(app.verdict.card).toBeHidden();
  });
});

test.describe("verdict presentation", () => {
  const cases = [
    {
      verdict: "Silent",
      setup: {},
      meaning: "No notification within 20 s of init",
      reason: "no notification within 20 s of init",
      next: "Export the log; capture the official app for comparison",
    },
    {
      verdict: "Talks",
      setup: { replies: [replyOnFirstA4(F.D3_ZERO)] },
      meaning: "Notifications arrive and no challenge was sent",
      reason: null,
      next: "Read telemetry; belt commands can be tried",
    },
    {
      verdict: "Unlocked",
      setup: {
        replies: [
          { whenHexStartsWith: F.A4, once: true, notify: [{ char: "f3" as const, hex: F.CHALLENGE, delayMs: 20 }] },
          { whenHexStartsWith: "F0 E0 00 00", once: true, notify: [{ char: "f3" as const, hex: F.ACK_57, delayMs: 100 }] },
        ],
      },
      meaning: "Challenge answered and acknowledged",
      reason: null,
      next: "Read telemetry; belt commands can be tried",
    },
    {
      verdict: "Locked",
      setup: { replies: [{ whenHexStartsWith: F.A4, once: true, notify: [{ char: "f3" as const, hex: F.CHALLENGE, delayMs: 20 }] }] },
      meaning: "Challenge invalid or not acknowledged in 2.5 s",
      reason: "no acknowledgement within 2.5 s",
      next: "Export the log with the challenge bytes",
    },
  ];
  for (const { verdict, setup, meaning, reason, next } of cases) {
    test(`L2-036: ${verdict} shows its word, meaning, reason, next step and Export log, announced politely`, async ({ app }) => {
      await app.open(setup);
      await app.connection.connect();
      await app.advance(25_000);
      await expect(app.verdict.word).toHaveText(verdict);
      await expect(app.verdict.meaning).toHaveText(meaning);
      if (reason === null) await expect(app.verdict.reason).toBeHidden();
      else await expect(app.verdict.reason).toHaveText(reason);
      await expect(app.verdict.nextStep).toHaveText(next);
      await expect(app.verdict.exportButton).toBeVisible();
      await expect(app.verdict.exportButton).toBeEnabled();
      await expect(app.verdict.liveRegion).toHaveCount(1);
      const exported = await app.log.exportLog(app.verdict.exportButton);
      expect(exported.text).toContain(`Verdict: ${verdict}`);
    });
  }
});
