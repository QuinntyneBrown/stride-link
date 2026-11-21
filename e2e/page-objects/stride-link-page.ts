// The whole page: opening it against the fake, and its regions.
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { installFakeBluetooth, type FakeOverrides } from "../fake-bluetooth/install.ts";
import { FakeControl } from "../fake-bluetooth/fake-control.ts";
import { F } from "../fake-bluetooth/frames.ts";
import { locked, silent, talks, unlocked, UNTIL_SILENT_MS, UNTIL_VERDICT_MS } from "../fake-bluetooth/scenarios.ts";
import { ConnectPanel } from "./connect-panel.ts";
import { StatusRegion } from "./status-region.ts";
import { PageFooter } from "./page-footer.ts";
import { LogPanel } from "./log-panel.ts";
import { BeltControls } from "./belt-controls.ts";
import { PageProbe } from "./page-probe.ts";
import { RunFacts } from "./run-facts.ts";
import { StopBar } from "./stop-bar.ts";
import { TelemetryPanel } from "./telemetry-panel.ts";
import { VerdictCard } from "./verdict-card.ts";

/** Every state the accessibility and layout audits visit (L2-062, L2-064). */
export const PAGE_STATES = [
  "idle",
  "unsupported",
  "adapter-off",
  "blocked-from-disk",
  "connecting",
  "error",
  "silent",
  "talks",
  "unlocked",
  "locked",
  "gate-open",
  "belt-active",
  "stop-failed",
  "connection-lost",
] as const;
export type PageStateName = (typeof PAGE_STATES)[number];

export const PAGE_URL = pathToFileURL(join(process.cwd(), "dist", "stride-link.html")).href;

export class StrideLinkPage {
  readonly page: Page;
  readonly fake: FakeControl;
  readonly status: StatusRegion;
  readonly connection: ConnectPanel;
  readonly footer: PageFooter;
  readonly log: LogPanel;
  readonly facts: RunFacts;
  readonly verdict: VerdictCard;
  readonly telemetry: TelemetryPanel;
  readonly belt: BeltControls;
  readonly stop: StopBar;
  readonly probe: PageProbe;

  constructor(page: Page) {
    this.page = page;
    this.fake = new FakeControl(page);
    this.status = new StatusRegion(page);
    this.connection = new ConnectPanel(page);
    this.footer = new PageFooter(page);
    this.log = new LogPanel(page);
    this.facts = new RunFacts(page);
    this.verdict = new VerdictCard(page);
    this.telemetry = new TelemetryPanel(page);
    this.belt = new BeltControls(page);
    this.stop = new StopBar(page);
    this.probe = new PageProbe(page);
  }

  /** Opens the page and drives it into a named state through the fake. */
  async reach(state: PageStateName): Promise<void> {
    switch (state) {
      case "idle":
        await this.open();
        await this.settle();
        return;
      case "unsupported":
        await this.open({ availability: "absent" });
        await this.settle();
        return;
      case "adapter-off":
        await this.open({ availability: false });
        await this.settle();
        return;
      case "blocked-from-disk":
        await this.open({ chooser: "SecurityError" });
        await this.connection.connect();
        await this.settle();
        return;
      case "connecting":
        await this.open({ connect: "hang" });
        await this.connection.connect();
        await this.settle();
        return;
      case "error":
        await this.open({ service: false });
        await this.connection.connect();
        await this.advance(1_000);
        return;
      case "silent":
        await this.open(silent);
        await this.connection.connect();
        await this.advance(UNTIL_SILENT_MS);
        return;
      case "talks":
      case "unlocked":
      case "locked":
        await this.open({ talks, unlocked, locked }[state]);
        await this.connection.connect();
        await this.advance(UNTIL_VERDICT_MS);
        return;
      case "gate-open":
        await this.reach("talks");
        await this.belt.standClear();
        return;
      case "belt-active":
        await this.reach("gate-open");
        await this.belt.start();
        await this.advance(100);
        return;
      case "stop-failed":
        await this.open({ ...talks, failWritesStartingWith: F.STOP });
        await this.connection.connect();
        await this.advance(UNTIL_VERDICT_MS);
        await this.belt.standClear();
        await this.belt.start();
        await this.advance(100);
        await this.stop.press();
        await this.advance(100);
        return;
      case "connection-lost":
        await this.reach("belt-active");
        await this.fake.dropConnection();
        await this.settle();
        return;
    }
  }

  async resize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  /** Scrolls the page to a fraction of its scrollable height. */
  async scrollPageTo(fraction: number): Promise<void> {
    // Instant: the page scrolls smoothly, which would wait on the paused clock.
    await this.page.evaluate((f) => {
      window.scrollTo({ top: (document.documentElement.scrollHeight - window.innerHeight) * f, behavior: "instant" });
    }, fraction);
  }

  async viewport(): Promise<{ width: number; height: number }> {
    return this.page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  }

  /** JS heap in use after a forced garbage collection, through the DevTools protocol. */
  async heapUsedBytes(): Promise<number> {
    const cdp = await this.page.context().newCDPSession(this.page);
    await cdp.send("HeapProfiler.collectGarbage");
    const { usedSize } = await cdp.send("Runtime.getHeapUsage");
    await cdp.detach();
    return usedSize;
  }

  /** Closes the tab as a tester would, running beforeunload; reports whether it asked to confirm. */
  async closeTab(): Promise<{ confirmationShown: boolean }> {
    let confirmationShown = false;
    this.page.on("dialog", (dialog) => {
      if (dialog.type() === "beforeunload") confirmationShown = true;
      void dialog.accept();
    });
    await this.page.close({ runBeforeUnload: true });
    await this.page.waitForEvent("close");
    return { confirmationShown };
  }

  /** The page clock's current performance.now(). */
  async now(): Promise<number> {
    return this.page.evaluate(() => performance.now());
  }

  /** Advances the page clock to an absolute performance.now() time. */
  async advanceTo(t: number): Promise<void> {
    const now = await this.now();
    if (t > now) await this.page.clock.runFor(t - now);
  }

  /** Installs the fake and the fake clock, then opens the built page from disk. */
  async open(overrides: FakeOverrides = {}): Promise<void> {
    await installFakeBluetooth(this.page, overrides);
    // A paused clock moves only when a test advances it, so every timing
    // assertion is exact (L2-070).
    await this.page.clock.install({ time: new Date("2026-11-20T09:30:00Z") });
    await this.page.clock.pauseAt(new Date("2026-11-20T09:30:01Z"));
    await this.page.goto(PAGE_URL);
  }

  /** Lets queued animation frames and zero-delay timers run. */
  async settle(): Promise<void> {
    await this.page.clock.runFor(50);
  }

  /** Advances the page clock, firing every timer that falls due. */
  async advance(ms: number): Promise<void> {
    await this.page.clock.runFor(ms);
  }
}
