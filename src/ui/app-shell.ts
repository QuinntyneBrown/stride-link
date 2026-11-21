// Binds the static page to the session state.
import type { BuildInfo } from "../build-info.ts";
import type { PacketLog } from "../session/packet-log.ts";
import type { RunController } from "../session/run-controller.ts";
import { byId, setText } from "./dom.ts";
import { downloadText } from "./file-downloader.ts";
import { LogView } from "./log-view.ts";
import { BeltPanel } from "./belt-panel.ts";
import { CONNECTION_LOST } from "./messages/belt-messages.ts";
import { statusMessages } from "./messages/connection-messages.ts";
import { StopBar } from "./stop-bar.ts";
import { TelemetryPanel } from "./telemetry-panel.ts";
import { VerdictPanel } from "./verdict-panel.ts";

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
    const verdictExport = byId(doc, "verdict-export", HTMLButtonElement);
    const verdict = new VerdictPanel({
      card: byId(doc, "verdict", HTMLElement),
      word: byId(doc, "verdict-word", HTMLElement),
      meaning: byId(doc, "verdict-meaning", HTMLElement),
      reasonTerm: byId(doc, "verdict-reason-term", HTMLElement),
      reason: byId(doc, "verdict-reason", HTMLElement),
      nextStep: byId(doc, "verdict-next-step", HTMLElement),
    });
    const telemetry = new TelemetryPanel({
      speed: byId(doc, "telemetry-speed", HTMLElement),
      incline: byId(doc, "telemetry-incline", HTMLElement),
      heartRate: byId(doc, "telemetry-heart-rate", HTMLElement),
    });

    const controller = this.controller;
    const belt = new BeltPanel(
      {
        panel: byId(doc, "belt-panel", HTMLElement),
        gate: byId(doc, "belt-gate", HTMLInputElement),
        gateLabel: byId(doc, "belt-gate-label", HTMLElement),
        controls: byId(doc, "belt-controls", HTMLElement),
        start: byId(doc, "belt-start", HTMLButtonElement),
        speed: byId(doc, "speed", HTMLInputElement),
        speedApply: byId(doc, "speed-apply", HTMLButtonElement),
        speedError: byId(doc, "speed-error", HTMLElement),
        incline: byId(doc, "incline", HTMLInputElement),
        inclineApply: byId(doc, "incline-apply", HTMLButtonElement),
        inclineError: byId(doc, "incline-error", HTMLElement),
      },
      {
        setGate: (open) => { controller.setBeltGate(open); },
        start: () => { controller.startBelt(); },
        setSpeed: (raw) => controller.setSpeed(raw),
        setIncline: (raw) => controller.setIncline(raw),
      },
    );
    const stopBar = new StopBar(
      {
        bar: byId(doc, "stop-bar", HTMLElement),
        button: byId(doc, "stop-belt", HTMLButtonElement),
        failed: byId(doc, "stop-failed", HTMLElement),
      },
      () => { controller.stopBelt(); },
    );
    const connectionLost = byId(doc, "connection-lost", HTMLElement);
    setText(byId(doc, "connection-lost-text", HTMLElement), CONNECTION_LOST);
    byId(doc, "connection-lost-dismiss", HTMLButtonElement).addEventListener("click", () => { controller.dismissConnectionLost(); });
    doc.defaultView?.addEventListener("pagehide", () => { controller.onPageHide(); });

    new LogView(
      {
        scroller: byId(doc, "log", HTMLElement),
        list: byId(doc, "log-list", HTMLOListElement),
        empty: byId(doc, "log-empty", HTMLElement),
        count: byId(doc, "log-count", HTMLElement),
      },
      this.log,
    );

    // Warn before closing with entries recorded since the last export (L2-041).
    doc.defaultView?.addEventListener("beforeunload", (event) => {
      if (this.log.hasUnexported()) event.preventDefault();
    });

    connect.addEventListener("click", () => { void this.controller.connect(); });
    disconnect.addEventListener("click", () => { void this.controller.disconnect(); });
    exportButton.addEventListener("click", () => { this.exportLog(); });
    verdictExport.addEventListener("click", () => { this.exportLog(); });

    this.controller.state.subscribe((state) => {
      setText(statusText, statusMessages[state.status]);
      connect.disabled = !state.connectEnabled;
      disconnect.hidden = !state.disconnectVisible;
      hostedRow.hidden = state.status !== "blocked-from-disk";
      facts.hidden = state.device === null;
      setText(deviceName, state.device?.name ?? "");
      setText(deviceVariant, state.device?.variant ?? "");
      exportButton.disabled = !state.canExport;
      verdict.render(state.verdict);
      telemetry.render(state.telemetry);
      belt.render(state.belt);
      stopBar.render(state.belt);
      connectionLost.hidden = !state.connectionLost;
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
