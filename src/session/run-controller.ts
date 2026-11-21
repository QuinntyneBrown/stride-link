// Orchestrates the page session: support check, chooser, connection and the run's
// lifetime (L2-002..012, L2-058).
import { ConnectionFailure, type BluetoothGateway, type SupportStatus } from "../ble/bluetooth-gateway.ts";
import type { TreadmillLink } from "../ble/treadmill-link.ts";
import { chooserOptions } from "../protocol/chooser-filters.ts";
import { errorFacts, type ErrorFacts } from "../protocol/errors.ts";
import { parseFrame, type ParsedFrame } from "../protocol/frame-parser.ts";
import type { NotifyChar } from "../protocol/uuids.ts";
import { detectVariant, displayName, isBikeName, variantLabel } from "../protocol/variant.ts";
import type { Clock } from "./clock.ts";
import { buildExport, exportFileName, type ExportEnvironment } from "./log-export.ts";
import type { PacketLog } from "./packet-log.ts";
import { emptyTelemetry, initialPageState, type PageState, type StatusKey } from "./page-state.ts";
import { decodeTelemetry } from "../protocol/telemetry.ts";
import { Run } from "./run.ts";
import { Store } from "./store.ts";

export const CONNECT_TIMEOUT_MS = 10_000;

type RunFailure = "connect-timeout" | "missing-service" | "connect-failed" | "subscribe-failed";

export class RunController {
  readonly state = new Store<PageState>(initialPageState);
  private readonly gateway: BluetoothGateway;
  private readonly log: PacketLog;
  private readonly clock: Clock;
  private readonly env: Omit<ExportEnvironment, "pageStartedAtIso">;
  private support: SupportStatus | "checking" = "checking";
  private busy = false;
  private run: Run | null = null;

  constructor(deps: { gateway: BluetoothGateway; log: PacketLog; clock: Clock; env: Omit<ExportEnvironment, "pageStartedAtIso"> }) {
    this.gateway = deps.gateway;
    this.log = deps.log;
    this.clock = deps.clock;
    this.env = deps.env;
    deps.log.onEntry(() => {
      if (!this.state.get().canExport) this.state.update({ canExport: true });
    });
  }

  async boot(): Promise<void> {
    this.gateway.onAvailabilityChanged((available) => {
      this.support = available ? "supported" : "adapter-unavailable";
      if (!this.busy) this.idle(this.support);
    });
    this.support = await this.gateway.checkSupport();
    if (!this.busy) this.idle(this.support);
  }

  /** The Connect press. requestDevice runs before the first await, inside the gesture. */
  async connect(): Promise<void> {
    if (this.busy || this.support !== "supported") return;
    this.busy = true;
    this.state.update({ status: "selecting", connectEnabled: false });
    let device: BluetoothDevice;
    try {
      device = await this.gateway.requestTreadmill(chooserOptions());
    } catch (error) {
      const { name, message } = errorFacts(error);
      this.log.page.recordEvent(`Chooser error ${name}: ${message}`);
      this.finish(name === "NotFoundError" ? "cancelled" : name === "SecurityError" ? "blocked-from-disk" : "chooser-failed");
      return;
    }
    const name = displayName(device.name);
    if (isBikeName(device.name)) {
      this.log.page.recordEvent(`Rejected Echelon bike: ${name}`);
      this.finish("bike-rejected");
      return;
    }
    const variant = detectVariant(device.name);
    const run = new Run(this.log.startRun(name, variant), variant, this.clock, (verdict) => {
      if (this.run === run) this.state.update({ verdict, status: "verdict" });
    });
    this.run = run;
    run.log.recordEvent(`Device selected: ${name}`);
    run.log.recordEvent(`Model variant: ${variantLabel(variant)}`);
    this.state.update({
      status: "connecting",
      device: { name, variant: variant === "stride4" ? "Stride 4" : "Standard" },
      verdict: null,
      telemetry: emptyTelemetry,
    });
    await this.open(run, device);
  }

  /** The Disconnect press. */
  disconnect(): void {
    const run = this.run;
    if (!run) return;
    run.log.recordEvent("Disconnect requested");
    run.link?.disconnect();
    this.teardown(run);
  }

  /** Builds the export from a snapshot; call completeExport once the download starts. */
  prepareExport(): { fileName: string; text: string; entryCount: number } {
    const snapshot = this.log.snapshot();
    return {
      fileName: exportFileName(this.log.latestDeviceName, new Date(this.clock.wallTime())),
      text: buildExport(snapshot, { ...this.env, pageStartedAtIso: this.log.pageStartedAtIso }),
      entryCount: snapshot.entryCount,
    };
  }

  completeExport(entryCount: number): void {
    this.log.markExported(entryCount);
  }

  exportFailed(error: unknown): void {
    const { name, message } = errorFacts(error);
    this.log.page.recordEvent(`Export failed ${name}: ${message}`);
    this.state.update({ status: "export-failed" });
  }

  private async open(run: Run, device: BluetoothDevice): Promise<void> {
    const timeout = run.after(CONNECT_TIMEOUT_MS, () => {
      this.fail(run, "connect-timeout", {
        name: "TimeoutError",
        message: `Connection and service discovery took longer than ${CONNECT_TIMEOUT_MS} ms.`,
      });
    });
    let link: TreadmillLink;
    try {
      link = await this.gateway.connect(device, run.abort.signal, (step) => {
        if (run.isAlive()) run.log.recordEvent(step === "connected" ? "Connected" : "Service found");
      });
    } catch (error) {
      if (!run.isAlive()) return;
      const kind = error instanceof ConnectionFailure ? error.kind : "connect-failed";
      device.gatt?.disconnect();
      this.fail(run, kind, errorFacts(error instanceof ConnectionFailure ? error.cause : error));
      return;
    }
    if (!run.isAlive()) {
      link.disconnect();
      return;
    }
    run.cancel(timeout);
    for (const line of link.describeCharacteristics()) run.log.recordEvent(line);
    run.attach(link);
    link.onDisconnected(() => { this.teardown(run); });
    try {
      await link.subscribe((char, bytes) => { this.onNotification(run, char, bytes); });
    } catch (error) {
      if (!run.isAlive()) return;
      this.fail(run, "subscribe-failed", errorFacts(error));
      return;
    }
    if (!run.isAlive()) return;
    run.log.recordEvent(`isNotifying f3: ${String(link.isNotifying("f3"))}`);
    run.log.recordEvent(`isNotifying f4: ${String(link.isNotifying("f4"))}`);
    run.log.recordEvent(`Write method: ${link.writeMethod}`);
    this.state.update({ status: "initialising", disconnectVisible: true });
    run.verdict.onInitStarted();
    const result = await run.init.start();
    if (result.status === "cancelled" || !run.isAlive()) return;
    run.keeper.start();
    run.verdict.onInitComplete();
    if (run.verdict.current === null) this.state.update({ status: "awaiting-verdict" });
  }

  /** Every notification: logged, then counted for pacing, then handled by kind. */
  private onNotification(run: Run, char: NotifyChar, bytes: Uint8Array): void {
    if (!run.isAlive()) return;
    const frame = parseFrame(bytes);
    run.log.recordRx(char, bytes, rxNote(frame));
    run.init.notifyReceived();
    run.verdict.onNotification(frame.kind === "E0");
    run.keeper.onFrame(frame);
    if (frame.kind === "E0") run.unlock.onE0(frame);
    this.applyTelemetry(run, frame);
  }

  private applyTelemetry(run: Run, frame: ParsedFrame): void {
    const update = decodeTelemetry(frame, run.variant);
    const current = this.state.get().telemetry;
    const next = {
      speedKmh: update.speedKmh ?? current.speedKmh,
      incline: update.incline ?? current.incline,
      heartRateBpm: update.heartRateBpm ?? current.heartRateBpm,
    };
    if (next.speedKmh !== current.speedKmh || next.incline !== current.incline || next.heartRateBpm !== current.heartRateBpm) {
      this.state.update({ telemetry: next });
    }
  }

  /** A failure before the run got going: logged, disconnected, back to idle. */
  private fail(run: Run, kind: RunFailure, error: ErrorFacts): void {
    if (!run.end(kind)) return;
    run.log.recordEvent(`Error ${error.name}: ${error.message}`);
    run.link?.dispose();
    run.link?.disconnect();
    if (this.run === run) this.run = null;
    this.finish(kind, { disconnectVisible: false });
  }

  /** Tester disconnect or connection loss (L2-012). Log and verdict are kept. */
  private teardown(run: Run): void {
    if (!run.isAlive()) return;
    run.verdict.onDisconnect(run.unlock.awaitingAck());
    if (!run.end("disconnected")) return;
    run.link?.dispose();
    run.log.recordEvent("Disconnected");
    if (this.run === run) this.run = null;
    this.finish("disconnected", { disconnectVisible: false });
  }

  private finish(status: StatusKey, extra: Partial<PageState> = {}): void {
    this.busy = false;
    this.state.update({ ...extra, status, connectEnabled: this.support === "supported" });
  }

  private idle(support: SupportStatus): void {
    const current = this.state.get().status;
    // Keep an outcome message visible while Bluetooth stays usable.
    const keep = support === "supported" && current !== "checking" && current !== "adapter-unavailable" && current !== "no-web-bluetooth";
    this.state.update({ status: keep ? current : support, connectEnabled: support === "supported" && !this.busy });
  }
}

function rxNote(frame: ParsedFrame): "malformed" | "unknown" | undefined {
  if (frame.kind === "unknown") return "unknown";
  return frame.malformed ? "malformed" : undefined;
}
