// The selected device's name and model variant (L2-008).
import type { Locator, Page } from "@playwright/test";

export class RunFacts {
  readonly deviceName: Locator;
  readonly variant: Locator;

  constructor(page: Page) {
    this.deviceName = page.locator("#device-name");
    this.variant = page.locator("#device-variant");
  }
}
