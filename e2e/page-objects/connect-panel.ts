// Connection controls: Connect, the ownership notice and the hosted-copy link.
import type { Locator, Page } from "@playwright/test";

export class ConnectPanel {
  readonly connectButton: Locator;
  readonly ownershipNotice: Locator;
  readonly hostedLink: Locator;

  constructor(page: Page) {
    this.connectButton = page.getByRole("button", { name: "Connect", exact: true });
    this.ownershipNotice = page.locator("#ownership-notice");
    this.hostedLink = page.locator("#hosted-link");
  }

  async connect(): Promise<void> {
    await this.connectButton.click();
  }
}
