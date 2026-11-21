// The footer, which shows the build version and commit (L2-068).
import type { Locator, Page } from "@playwright/test";

export class PageFooter {
  readonly version: Locator;
  readonly commit: Locator;

  constructor(page: Page) {
    this.version = page.locator("#build-version");
    this.commit = page.locator("#build-commit");
  }
}
