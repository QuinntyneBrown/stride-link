// Traces to: L2-045, L2-064, L2-065, L2-066, L2-067
import { test, expect } from "../fixtures.ts";
import { F } from "../fake-bluetooth/frames.ts";
import { PAGE_STATES } from "../page-objects/stride-link-page.ts";

const ORDER = ["status", "connection", "telemetry", "belt", "log"] as const;

test.describe("extra small and small (under 768 px)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const state of PAGE_STATES) {
    test(`L2-064: ${state} at 320 px has no horizontal scroll`, async ({ app }) => {
      await app.reach(state);
      expect(await app.probe.hasHorizontalScroll()).toBe(false);
    });
  }

  for (const state of ["belt-active", "stop-failed"] as const) {
    test(`L2-045, L2-064: in ${state} at 320 px the Stop label fits inside the button`, async ({ app }) => {
      await app.reach(state);
      expect(await app.probe.contentOverflows(app.stop.button)).toBe(false);
      await expect(app.stop.button).toBeInViewport({ ratio: 1 });
    });
  }

  test("L2-061: the connection-lost Dismiss button keeps its own height beside wrapped text", async ({ app }) => {
    await app.reach("connection-lost");
    const box = await app.stop.dismissConnectionLost.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeLessThanOrEqual(48);
  });

  test("L2-064: one column in the order status, connection, telemetry, belt, log", async ({ app }) => {
    await app.reach("gate-open");
    const boxes = await Promise.all(ORDER.map((r) => app.probe.box(r)));
    for (let i = 1; i < boxes.length; i += 1) {
      expect(boxes[i]?.y ?? 0, ORDER[i]).toBeGreaterThan((boxes[i - 1]?.y ?? 0) + (boxes[i - 1]?.height ?? 0) - 1);
      expect(Math.abs((boxes[i]?.x ?? 0) - (boxes[0]?.x ?? 0))).toBeLessThanOrEqual(1);
    }
  });

  test("L2-064: at 375 px Stop is a full-width bar fixed to the bottom and hides nothing for good", async ({ app }) => {
    await app.resize(375, 667);
    await app.reach("belt-active");
    for (const fraction of [0, 0.5, 1]) {
      await app.scrollPageTo(fraction);
      const bar = await app.probe.box("stopBar");
      expect(bar?.x).toBe(0);
      expect(bar?.width).toBe(375);
      expect((bar?.y ?? 0) + (bar?.height ?? 0)).toBeCloseTo(667, 0);
    }
    await app.scrollPageTo(1);
    const footer = await app.probe.box("footer");
    const bar = await app.probe.box("stopBar");
    expect((footer?.y ?? 0) + (footer?.height ?? 0)).toBeLessThanOrEqual((bar?.y ?? 0) + 1);
  });

  for (const width of [576, 767]) {
    test(`L2-064: at ${width} px telemetry sits in one row of three`, async ({ app }) => {
      await app.resize(width, 800);
      await app.reach("talks");
      const boxes = await Promise.all([app.telemetry.speed, app.telemetry.incline, app.telemetry.heartRate].map((l) => l.boundingBox()));
      expect(new Set(boxes.map((b) => Math.round(b?.y ?? -1))).size).toBe(1);
      expect(boxes[0]?.x ?? 0).toBeLessThan(boxes[1]?.x ?? 0);
      expect(boxes[1]?.x ?? 0).toBeLessThan(boxes[2]?.x ?? 0);
    });
  }

  test("L2-064: a long hex line wraps inside the log, never scrolling the page", async ({ app }) => {
    await app.reach("talks");
    await app.fake.notify("f3", Array.from({ length: 64 }, (_, i) => (i === 0 ? "F0" : "AB")).join(" "));
    await app.settle();
    expect(await app.probe.hasHorizontalScroll()).toBe(false);
  });
});

test.describe("medium (768 to 991 px)", () => {
  test.use({ viewport: { width: 768, height: 900 } });

  test("L2-065: one centred column no wider than 720 px", async ({ app }) => {
    await app.reach("gate-open");
    const primary = await app.probe.box("primary");
    const log = await app.probe.box("log");
    expect(primary?.width).toBeLessThanOrEqual(720);
    expect(log?.width).toBeLessThanOrEqual(720);
    expect(Math.abs((log?.x ?? 0) - (primary?.x ?? 0))).toBeLessThanOrEqual(1);
    expect((log?.y ?? 0)).toBeGreaterThan((primary?.y ?? 0) + (primary?.height ?? 0) - 1);
    const left = primary?.x ?? 0;
    const right = 768 - left - (primary?.width ?? 0);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  });

  test("L2-065: with the belt active Stop is fixed in the viewport", async ({ app }) => {
    await app.reach("belt-active");
    for (const fraction of [0, 1]) {
      await app.scrollPageTo(fraction);
      const box = await app.stop.box();
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(900);
      expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe("large and extra large (992 px and up)", () => {
  test("L2-066: at 992 px the log is the right-hand column", async ({ app }) => {
    await app.resize(992, 800);
    await app.reach("talks");
    const primary = await app.probe.box("primary");
    const log = await app.probe.box("log");
    expect(log?.x ?? 0).toBeGreaterThanOrEqual((primary?.x ?? 0) + (primary?.width ?? 0));
    expect(Math.abs((log?.y ?? 0) - (primary?.y ?? 0))).toBeLessThanOrEqual(1);
  });

  for (const width of [1200, 1920]) {
    test(`L2-066: at ${width} px content is at most 1140 px wide and centred`, async ({ app }) => {
      await app.resize(width, 900);
      await app.reach("talks");
      const primary = await app.probe.box("primary");
      const log = await app.probe.box("log");
      const left = primary?.x ?? 0;
      const right = (log?.x ?? 0) + (log?.width ?? 0);
      expect(right - left).toBeLessThanOrEqual(1140);
      expect(Math.abs(left - (width - right))).toBeLessThanOrEqual(1);
    });
  }

  test("L2-066: as the log grows it scrolls on its own and the left column stays put", async ({ app }) => {
    await app.resize(1280, 800);
    await app.reach("talks");
    const before = await app.probe.box("primary");
    const height = await app.probe.documentHeight();
    await app.fake.notifyEvery("f3", F.D1, 5, 400);
    await app.advance(2_100);
    expect((await app.log.scrollState()).scrollable).toBe(true);
    expect(await app.probe.documentHeight()).toBe(height);
    expect(await app.probe.box("primary")).toEqual(before);
  });
});

test.describe("orientation and zoom", () => {
  test("L2-067: rotating 412 x 915 to 915 x 412 keeps every control reachable and nothing clipped", async ({ app }) => {
    await app.resize(412, 915);
    await app.reach("gate-open");
    await app.resize(915, 412);
    expect(await app.probe.hasHorizontalScroll()).toBe(false);
    for (const control of [app.connection.disconnectButton, app.belt.gate, app.belt.startButton, app.belt.speedInput, app.belt.inclineInput, app.log.exportButton]) {
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeInViewport({ ratio: 1 });
    }
  });

  test("L2-067: the viewport meta allows zoom", async ({ app }) => {
    await app.reach("idle");
    const meta = await app.probe.viewportMeta();
    expect(meta).toBe("width=device-width, initial-scale=1");
    expect(meta).not.toMatch(/user-scalable|maximum-scale/);
  });

  test("L2-067: at 200 % zoom on a 1280 px window everything works without horizontal scroll", async ({ app }) => {
    // 200 % zoom of a 1280 x 800 window lays out as 640 x 400 CSS px.
    await app.resize(640, 400);
    await app.reach("belt-active");
    expect(await app.probe.hasHorizontalScroll()).toBe(false);
    for (const control of [app.belt.speedInput, app.belt.setSpeedButton, app.log.exportButton, app.connection.disconnectButton]) {
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeInViewport();
    }
    await expect(app.stop.button).toBeInViewport({ ratio: 1 });
  });

  test("L2-067: body text is at least 16 px", async ({ app }) => {
    await app.reach("idle");
    for (const part of ["body", "status-text", "subtitle"] as const) {
      expect(await app.probe.fontSizePx(part), part).toBeGreaterThanOrEqual(16);
    }
  });
});
