// The packet log panel: on-screen rows and Export log (L2-037..041).
import type { Locator, Page } from "@playwright/test";

export interface ExportedLog {
  fileName: string;
  text: string;
  bytes: Buffer;
}

export interface ExportTrace extends ExportedLog {
  /** Object URLs created and revoked while exporting. */
  created: string[];
  revoked: string[];
  /** Network requests the page made while exporting. */
  requests: string[];
  /** Real milliseconds from the press to the download starting. */
  startedAfterMs: number;
}

export interface ScrollState {
  scrollTop: number;
  atBottom: boolean;
  scrollable: boolean;
}

export class LogPanel {
  private readonly page: Page;
  readonly log: Locator;
  readonly rows: Locator;
  readonly runHeadings: Locator;
  readonly exportButton: Locator;
  readonly count: Locator;

  constructor(page: Page) {
    this.page = page;
    this.log = page.getByRole("log", { name: "Packet log" });
    this.rows = page.locator("#log-list .log__line");
    this.runHeadings = page.locator("#log-list .log__run");
    this.exportButton = page.locator("#log-panel").getByRole("button", { name: "Export log" });
    this.count = page.locator("#log-count");
  }

  async scrollToTop(): Promise<void> {
    await this.log.evaluate((el) => { el.scrollTop = 0; });
  }

  async scrollToBottom(): Promise<void> {
    await this.log.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  }

  async scrollState(): Promise<ScrollState> {
    return this.log.evaluate((el) => ({
      scrollTop: el.scrollTop,
      atBottom: el.scrollHeight - el.scrollTop - el.clientHeight < 4,
      scrollable: el.scrollHeight > el.clientHeight,
    }));
  }

  /** Exports while watching object URLs and network requests; then lets the revoke timer run. */
  async exportLogTraced(): Promise<ExportTrace> {
    await this.page.evaluate(() => {
      const w = window as unknown as { __urls: { created: string[]; revoked: string[] } };
      w.__urls = { created: [], revoked: [] };
      const create = URL.createObjectURL.bind(URL);
      const revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = (obj: Blob | MediaSource) => {
        const url = create(obj);
        w.__urls.created.push(url);
        return url;
      };
      URL.revokeObjectURL = (url: string) => {
        w.__urls.revoked.push(url);
        revoke(url);
      };
    });
    const requests: string[] = [];
    const onRequest = (request: { url(): string }): void => {
      if (!/^(blob|data|file):/.test(request.url())) requests.push(request.url());
    };
    this.page.on("request", onRequest);
    const started = performance.now();
    const exported = await this.exportLog();
    const startedAfterMs = performance.now() - started;
    await this.page.clock.runFor(10);
    this.page.off("request", onRequest);
    const urls = await this.page.evaluate(() => (window as unknown as { __urls: { created: string[]; revoked: string[] } }).__urls);
    return { ...exported, ...urls, requests, startedAfterMs };
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
