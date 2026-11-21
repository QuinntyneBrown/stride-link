// The verdict: word, meaning, reason, next step and its Export log (L2-036).
import type { Locator, Page } from "@playwright/test";

export class VerdictCard {
  readonly card: Locator;
  readonly word: Locator;
  readonly meaning: Locator;
  readonly reason: Locator;
  readonly nextStep: Locator;
  readonly exportButton: Locator;
  /** The polite live region the verdict is announced through. */
  readonly liveRegion: Locator;

  constructor(page: Page) {
    this.card = page.locator("#verdict");
    this.word = page.locator("#verdict-word");
    this.meaning = page.locator("#verdict-meaning");
    this.reason = page.locator("#verdict-reason");
    this.nextStep = page.locator("#verdict-next-step");
    this.exportButton = this.card.getByRole("button", { name: "Export log" });
    this.liveRegion = page.locator('[aria-live="polite"]').filter({ has: this.word });
  }
}
