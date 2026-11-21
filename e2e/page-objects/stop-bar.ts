// Stop belt and the connection-lost banner (L2-044, L2-045, L2-048).
import type { Locator, Page } from "@playwright/test";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class StopBar {
  private readonly page: Page;
  readonly button: Locator;
  readonly failed: Locator;
  readonly connectionLost: Locator;
  readonly dismissConnectionLost: Locator;

  constructor(page: Page) {
    this.page = page;
    this.button = page.getByRole("button", { name: "Stop belt" });
    this.failed = page.locator("#stop-failed");
    this.connectionLost = page.locator("#connection-lost");
    this.dismissConnectionLost = this.connectionLost.getByRole("button", { name: "Dismiss" });
  }

  async press(): Promise<void> {
    await this.button.click();
  }

  async pressKey(key: "Enter" | " "): Promise<void> {
    await this.button.focus();
    await this.page.keyboard.press(key === " " ? "Space" : key);
  }

  /** Escape from whatever has focus. */
  async pressEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  async box(): Promise<Box | null> {
    return this.button.boundingBox();
  }

  /** Presses Tab from the top of the page until Stop has focus; returns the presses, or null. */
  async tabToStop(maxPresses = 80): Promise<number | null> {
    await this.page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo(0, 0);
    });
    for (let presses = 1; presses <= maxPresses; presses += 1) {
      await this.page.keyboard.press("Tab");
      if (await this.button.evaluate((el) => el === document.activeElement)) return presses;
    }
    return null;
  }

  /** Fires pagehide as the browser does when the tab goes away (L2-048). */
  async firePagehide(): Promise<void> {
    await this.page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false })); });
  }
}
