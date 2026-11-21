// The whole page: opening it against the fake, and its regions.
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { installFakeBluetooth, type FakeOverrides } from "../fake-bluetooth/install.ts";
import { FakeControl } from "../fake-bluetooth/fake-control.ts";
import { ConnectPanel } from "./connect-panel.ts";
import { StatusRegion } from "./status-region.ts";
import { PageFooter } from "./page-footer.ts";
import { LogPanel } from "./log-panel.ts";
import { RunFacts } from "./run-facts.ts";

export const PAGE_URL = pathToFileURL(join(process.cwd(), "dist", "stride-link.html")).href;

export class StrideLinkPage {
  readonly page: Page;
  readonly fake: FakeControl;
  readonly status: StatusRegion;
  readonly connection: ConnectPanel;
  readonly footer: PageFooter;
  readonly log: LogPanel;
  readonly facts: RunFacts;

  constructor(page: Page) {
    this.page = page;
    this.fake = new FakeControl(page);
    this.status = new StatusRegion(page);
    this.connection = new ConnectPanel(page);
    this.footer = new PageFooter(page);
    this.log = new LogPanel(page);
    this.facts = new RunFacts(page);
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
