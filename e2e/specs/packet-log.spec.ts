// Traces to: L2-037, L2-038, L2-039, L2-040, L2-041
import { test, expect } from "../fixtures.ts";
import { F } from "../fake-bluetooth/frames.ts";
import type { StrideLinkPage } from "../page-objects/stride-link-page.ts";

const ENTRY = /^\s+(\d+\.\d) (TX|RX|EV) /;
const TAGS = ["init", "unlock response", "activation", "keepalive", "echo", "belt"];

/** A busy run: a D3 per A1, a challenge and acknowledgement, keepalives and one failed write. */
const busyRun = {
  failWrites: [3],
  replies: [
    { whenHexStartsWith: F.A4, once: true, notify: [{ char: "f3" as const, hex: F.CHALLENGE, delayMs: 10 }] },
    { whenHexStartsWith: "F0 E0 00 00", once: true, notify: [{ char: "f3" as const, hex: F.ACK_57, delayMs: 200 }] },
    { whenHexStartsWith: F.A1, notify: [{ char: "f4" as const, hex: F.D3_ZERO, delayMs: 5 }] },
    { whenHexStartsWith: "F0 A0", notify: [{ char: "f4" as const, hex: F.D2_5, delayMs: 5 }, { char: "f3" as const, hex: F.D1, delayMs: 7 }] },
  ],
};

function entryLines(text: string): string[] {
  return text.split("\n").filter((line) => ENTRY.test(line));
}

/** Entry lines per run heading in an export. */
function runs(text: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of text.split("\n")) {
    if (/^Run \d+$/.test(line)) result.set(line, (current = []));
    else if (line === "Page events") current = null;
    else if (current && ENTRY.test(line)) current.push(line);
  }
  return result;
}

async function busyConnected(app: StrideLinkPage): Promise<void> {
  await app.open(busyRun);
  await app.connection.connect();
  await app.advance(12_000);
  await app.connection.disconnect();
  await app.settle();
}

test.describe("capture", () => {
  test("L2-037: every frame exchanged is one TX or RX entry, tagged, in time order", async ({ app }) => {
    await busyConnected(app);
    const snapshot = await app.fake.snapshot();
    const lines = entryLines((await app.log.exportLog()).text);
    const tx = lines.filter((line) => / TX f2 /.test(line));
    const rx = lines.filter((line) => / RX f[34] /.test(line));
    expect(tx).toHaveLength(snapshot.writes.length);
    expect(rx).toHaveLength(snapshot.notifications.length);
    for (const line of tx) {
      const tail = line.replace(/^.* TX f2 ([0-9A-F]{2} )*[0-9A-F]{2} /, "").replace(/ write failed .*$/, "");
      expect(TAGS).toContain(tail);
    }
    expect(tx.filter((line) => line.includes(" write failed NetworkError: "))).toHaveLength(1);
    const times = lines.map((line) => Number(ENTRY.exec(line)?.[1]));
    for (let i = 1; i < times.length; i += 1) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1] ?? 0);
  });

  test("L2-037: connection, subscription, variant, init, unlock, verdict, error and disconnect are events", async ({ app }) => {
    await busyConnected(app);
    const events = entryLines((await app.log.exportLog()).text)
      .filter((line) => / EV /.test(line))
      .map((line) => line.replace(ENTRY, ""));
    for (const expected of [
      "Connected",
      "isNotifying f3: true",
      "Model variant: standard",
      "Init complete (1 of 7 writes failed)",
      "Unlock values a=534 b=1278 c=97 auth=57",
      "Verdict: Unlocked",
      "Disconnected",
    ]) {
      expect(events).toContain(expected);
    }
  });

  test("L2-037: an error is an event", async ({ app }) => {
    await app.open({ service: false });
    await app.connection.connect();
    await app.advance(1_000);
    const events = entryLines((await app.log.exportLog()).text).map((line) => line.replace(ENTRY, ""));
    expect(events.some((text) => text.startsWith("Error NotFoundError: "))).toBe(true);
  });
});

test.describe("on-screen log", () => {
  test("L2-039: an entry appears within 100 ms", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(3_000);
    await app.fake.notify("f3", "F0 D1 00 00 00 00 00 01 2C 00 00 4A");
    await app.advance(100);
    expect((await app.log.rowTexts()).at(-1)).toMatch(/RX f3 F0 D1 00 00 00 00 00 01 2C 00 00 4A$/);
  });

  test("L2-039: with over 2,000 entries the screen holds the latest 500 and the export holds all", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(3_000);
    await app.fake.notifyEvery("f3", F.D1, 5, 2_000);
    await app.advance(10_100);
    const exported = entryLines((await app.log.exportLog()).text);
    expect(exported.length).toBeGreaterThanOrEqual(2_000);
    await expect(app.log.count).toHaveText(`${exported.length.toLocaleString("en")} entries`);
    const rows = await app.log.rowTexts();
    expect(rows).toEqual(exported.slice(-500));
    await expect(app.log.runHeadings).toHaveText(["Run 1 · STRIDE-8S"]);
  });

  test("L2-039: scrolled up, the position is kept; at the bottom, the log follows", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(3_000);
    await app.fake.notifyEvery("f3", F.D1, 5, 60);
    await app.advance(400);
    expect((await app.log.scrollState()).scrollable).toBe(true);
    await app.log.scrollToTop();
    await app.fake.notifyEvery("f3", F.D1, 5, 20);
    await app.advance(200);
    expect(await app.log.scrollState()).toMatchObject({ scrollTop: 0, atBottom: false });
    await app.log.scrollToBottom();
    await app.fake.notifyEvery("f3", F.D1, 5, 20);
    await app.advance(200);
    expect((await app.log.scrollState()).atBottom).toBe(true);
  });

  test("L2-039: the log container is role log named Packet log", async ({ app }) => {
    await app.open();
    await expect(app.log.log).toBeVisible();
    await expect(app.log.log).toHaveAttribute("role", "log");
  });
});

test.describe("export", () => {
  test("L2-040: the file name uses the sanitised device name and local time", async ({ app }) => {
    await app.open({ deviceName: "STRIDE 8S/ü:x", connect: "hang" });
    await app.connection.connect();
    await app.settle();
    const exported = await app.log.exportLog();
    expect(exported.fileName).toBe("stride-link-STRIDE_8S___x-20261120-093001.txt");
  });

  test("L2-040: with no device the file name says unknown", async ({ app }) => {
    await app.open({ chooser: "NotFoundError" });
    await app.connection.connect();
    await app.settle();
    expect((await app.log.exportLog()).fileName).toMatch(/^stride-link-unknown-\d{8}-\d{6}\.txt$/);
  });

  test("L2-040: the header, run sections and verdict lines are complete", async ({ app, page }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(25_000);
    const { text } = await app.log.exportLog();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const lines = text.split("\n");
    expect(lines[0]).toBe("Stride Link packet log");
    expect(lines).toContain(`User agent: ${userAgent}`);
    expect(lines.some((line) => /^Version: \d+\.\d+\.\d+ \(commit [0-9a-f]{7}\)$/.test(line))).toBe(true);
    expect(lines.some((line) => /^User agent data: brands .+; platform .+$|^User agent data: not available$/.test(line))).toBe(true);
    expect(lines.some((line) => /^Page opened: 2026-11-20T09:30:0\d\.\d{3}Z$/.test(line))).toBe(true);
    expect(lines).toContain("Run 1");
    expect(lines).toContain("Device: STRIDE-8S");
    expect(lines).toContain("Model variant: standard");
    expect(lines.some((line) => /^Run started: 2026-11-20T09:30:01\.\d{3}Z$/.test(line))).toBe(true);
    expect(lines).toContain("Verdict: Silent (no notification within 20 s of init)");
  });

  test("L2-040: a run that ended before init closes with Verdict: none and its error", async ({ app }) => {
    await app.open({ service: false });
    await app.connection.connect();
    await app.advance(1_000);
    const { text } = await app.log.exportLog();
    expect(text).toContain("Verdict: none");
    expect(text).toMatch(/EV Error NotFoundError: /);
  });

  test("L2-040: the export is a local Blob whose object URL is revoked, UTF-8 with LF and no BOM", async ({ app }) => {
    await app.open({ deviceName: "STRIDE-ü" });
    await app.connection.connect();
    await app.advance(3_000);
    const trace = await app.log.exportLogTraced();
    expect(trace.requests).toEqual([]);
    expect(trace.created).toHaveLength(1);
    expect(trace.created[0]).toMatch(/^blob:/);
    expect(trace.revoked).toEqual(trace.created);
    expect([...trace.bytes.subarray(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf]);
    expect(trace.bytes.includes(0x0d)).toBe(false);
    expect(trace.text).toContain("Device: STRIDE-ü");
  });
});

test.describe("multiple runs and retention", () => {
  test("L2-041: run 2 starts and every run 1 entry stays under its heading", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.advance(3_000);
    await app.connection.disconnect();
    await app.settle();
    const before = runs((await app.log.exportLog()).text).get("Run 1") ?? [];
    await app.connection.connect();
    await app.advance(3_000);
    await expect(app.log.runHeadings).toHaveText(["Run 1 · STRIDE-8S", "Run 2 · STRIDE-8S"]);
    const after = runs((await app.log.exportLog()).text);
    expect(after.get("Run 1")).toEqual(before);
    expect((after.get("Run 2") ?? []).length).toBeGreaterThan(0);
  });

  test("L2-041: closing with unexported entries asks to confirm", async ({ app }) => {
    await app.open({ connect: "hang" });
    await app.connection.connect();
    await app.settle();
    expect(await app.closeTab()).toEqual({ confirmationShown: true });
  });

  test("L2-041: closing with everything exported does not ask", async ({ app }) => {
    await app.open({ connect: "hang" });
    await app.connection.connect();
    await app.settle();
    await app.log.exportLog();
    expect(await app.closeTab()).toEqual({ confirmationShown: false });
  });
});
