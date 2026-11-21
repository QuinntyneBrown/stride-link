// The packet log panel: on-screen rows and Export log (L2-037..041).
import type { Locator, Page } from "@playwright/test";

export interface ExportedLog {
  fileName: string;
  text: string;
  bytes: Buffer;
}

export class LogPanel {
  private readonly page: Page;
  readonly log: Locator;
  readonly rows: Locator;
  readonly runHeadings: Locator;
  readonly exportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.log = page.getByRole("log", { name: "Packet log" });
    this.rows = page.locator("#log-list .log__line");
    this.runHeadings = page.locator("#log-list .log__run");
    this.exportButton = page.locator("#log-panel").getByRole("button", { name: "Export log" });
  }

  async rowTexts(): Promise<string[]> {
    return this.rows.allTextContents();
  }

  /** Presses Export log and reads the downloaded file. */
  async exportLog(button: Locator = this.exportButton): Promise<ExportedLog> {
    const [download] = await Promise.all([this.page.waitForEvent("download"), button.click()]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const bytes = Buffer.concat(chunks);
    return { fileName: download.suggestedFilename(), text: bytes.toString("utf8"), bytes };
  }
}
