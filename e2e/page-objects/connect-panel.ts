// Connection controls: Connect, the ownership notice and the hosted-copy link.
import type { Locator, Page } from "@playwright/test";

export class ConnectPanel {
  readonly connectButton: Locator;
  readonly ownershipNotice: Locator;
  readonly hostedLink: Locator;
  readonly disconnectButton: Locator;

  constructor(page: Page) {
    this.connectButton = page.getByRole("button", { name: "Connect", exact: true });
    this.ownershipNotice = page.locator("#ownership-notice");
    this.disconnectButton = page.getByRole("button", { name: "Disconnect", exact: true });
    this.hostedLink = page.getByRole("link", { name: "Open the hosted copy" });
  }

  async connect(): Promise<void> {
    await this.connectButton.click();
  }

  async disconnect(): Promise<void> {
    await this.disconnectButton.click();
  }
}
