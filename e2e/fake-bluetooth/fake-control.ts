// Test-side handle on the fake installed in the page.
import type { Page } from "@playwright/test";
import type { FakeSnapshot } from "./fake-config.ts";

interface FakeInPage {
  snapshot(): FakeSnapshot;
  notify(char: "f3" | "f4", hex: string): void;
  dropConnection(): void;
  setAvailability(value: boolean): void;
  notifyEvery(char: "f3" | "f4", hex: string, intervalMs: number, count: number): void;
}

declare global {
  interface Window {
    __fakeBluetooth: FakeInPage;
  }
}

export class FakeControl {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  snapshot(): Promise<FakeSnapshot> {
    return this.page.evaluate(() => window.__fakeBluetooth.snapshot());
  }

  /** Hex of every f2 write, in the order the fake received them. */
  async writtenHex(): Promise<string[]> {
    return (await this.snapshot()).writes.map((w) => w.hex);
  }

  async callNames(): Promise<string[]> {
    return (await this.snapshot()).calls.map((c) => c.name);
  }

  notify(char: "f3" | "f4", hex: string): Promise<void> {
    return this.page.evaluate(([c, h]) => { window.__fakeBluetooth.notify(c, h); }, [char, hex] as const);
  }

  dropConnection(): Promise<void> {
    return this.page.evaluate(() => { window.__fakeBluetooth.dropConnection(); });
  }

  setAvailability(value: boolean): Promise<void> {
    return this.page.evaluate((v) => { window.__fakeBluetooth.setAvailability(v); }, value);
  }

  notifyEvery(char: "f3" | "f4", hex: string, intervalMs: number, count: number): Promise<void> {
    return this.page.evaluate(([c, h, i, n]) => { window.__fakeBluetooth.notifyEvery(c, h, i, n); }, [char, hex, intervalMs, count] as const);
  }
}
