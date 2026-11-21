// The status line: an aria-live="polite" region (L2-063).
import type { Locator, Page } from "@playwright/test";

export class StatusRegion {
  readonly region: Locator;
  readonly text: Locator;

  constructor(page: Page) {
    this.region = page.locator("#status");
    this.text = page.locator("#status-text");
  }
}
