// Binds the static page to the session state.
import type { BuildInfo } from "../build-info.ts";
import type { PacketLog } from "../session/packet-log.ts";
import type { RunController } from "../session/run-controller.ts";
import { byId, setText } from "./dom.ts";
import { downloadText } from "./file-downloader.ts";
import { LogView } from "./log-view.ts";
import { statusMessages } from "./messages/connection-messages.ts";

export class AppShell {
  private readonly doc: Document;
  private readonly controller: RunController;
  private readonly log: PacketLog;

  constructor(doc: Document, controller: RunController, log: PacketLog) {
    this.doc = doc;
    this.controller = controller;
    this.log = log;
  }

  mount(build: BuildInfo): void {
    const doc = this.doc;
    setText(byId(doc, "build-version", HTMLElement), `v${build.version}`);
    setText(byId(doc, "build-commit", HTMLElement), build.commit);
    const statusText = byId(doc, "status-text", HTMLElement);
    const connect = byId(doc, "connect", HTMLButtonElement);
    const disconnect = byId(doc, "disconnect", HTMLButtonElement);
    const hostedRow = byId(doc, "hosted-link-row", HTMLElement);
    byId(doc, "hosted-link", HTMLAnchorElement).href = build.hostedUrl;
    const facts = byId(doc, "run-facts", HTMLElement);
    const deviceName = byId(doc, "device-name", HTMLElement);
    const deviceVariant = byId(doc, "device-variant", HTMLElement);
    const exportButton = byId(doc, "export-log", HTMLButtonElement);

    new LogView(
      {
        scroller: byId(doc, "log", HTMLElement),
        list: byId(doc, "log-list", HTMLOListElement),
        empty: byId(doc, "log-empty", HTMLElement),
        count: byId(doc, "log-count", HTMLElement),
      },
      this.log,
    );

    connect.addEventListener("click", () => { void this.controller.connect(); });
    disconnect.addEventListener("click", () => { this.controller.disconnect(); });
    exportButton.addEventListener("click", () => { this.exportLog(); });

    this.controller.state.subscribe((state) => {
      setText(statusText, statusMessages[state.status]);
      connect.disabled = !state.connectEnabled;
      disconnect.hidden = !state.disconnectVisible;
      hostedRow.hidden = state.status !== "blocked-from-disk";
      facts.hidden = state.device === null;
      setText(deviceName, state.device?.name ?? "");
      setText(deviceVariant, state.device?.variant ?? "");
      exportButton.disabled = !state.canExport;
    });
  }

  private exportLog(): void {
    const prepared = this.controller.prepareExport();
    try {
      downloadText(this.doc, prepared.fileName, prepared.text);
      this.controller.completeExport(prepared.entryCount);
    } catch (error) {
      this.controller.exportFailed(error);
    }
  }
}
