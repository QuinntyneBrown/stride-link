// Orchestrates the page session: support check, chooser, then runs (L2-002..009).
import type { BluetoothGateway, SupportStatus } from "../ble/bluetooth-gateway.ts";
import { chooserOptions } from "../protocol/chooser-filters.ts";
import { errorFacts } from "../protocol/errors.ts";
import { detectVariant, displayName, isBikeName, variantLabel } from "../protocol/variant.ts";
import type { Clock } from "./clock.ts";
import { buildExport, exportFileName, type ExportEnvironment } from "./log-export.ts";
import type { PacketLog } from "./packet-log.ts";
import { initialPageState, type PageState } from "./page-state.ts";
import { Store } from "./store.ts";

export class RunController {
  readonly state = new Store<PageState>(initialPageState);
  private readonly gateway: BluetoothGateway;
  private readonly log: PacketLog;
  private readonly clock: Clock;
  private readonly env: Omit<ExportEnvironment, "pageStartedAtIso">;
  private support: SupportStatus | "checking" = "checking";
  private busy = false;

  constructor(deps: { gateway: BluetoothGateway; log: PacketLog; clock: Clock; env: Omit<ExportEnvironment, "pageStartedAtIso"> }) {
    this.gateway = deps.gateway;
    this.log = deps.log;
    this.clock = deps.clock;
    this.env = deps.env;
    const log = deps.log;
    log.onEntry(() => {
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
      this.log.recordEvent(`Chooser error ${name}: ${message}`);
      this.finish(name === "NotFoundError" ? "cancelled" : name === "SecurityError" ? "blocked-from-disk" : "chooser-failed");
      return;
    }
    const name = displayName(device.name);
    if (isBikeName(device.name)) {
      this.log.recordEvent(`Rejected Echelon bike: ${name}`);
      this.finish("bike-rejected");
      return;
    }
    const variant = detectVariant(device.name);
    this.log.startRun(name, variant);
    this.log.recordEvent(`Device selected: ${name}`);
    this.log.recordEvent(`Model variant: ${variantLabel(variant)}`);
    this.state.update({ status: "connecting", device: { name, variant: variant === "stride4" ? "Stride 4" : "Standard" } });
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
    this.log.recordEvent(`Export failed ${name}: ${message}`);
    this.state.update({ status: "export-failed" });
  }

  private finish(status: PageState["status"]): void {
    this.busy = false;
    this.state.update({ status, connectEnabled: this.support === "supported" });
  }

  private idle(support: SupportStatus): void {
    const current = this.state.get().status;
    // Keep an outcome message visible while Bluetooth stays usable.
    const keep = support === "supported" && current !== "checking" && current !== "adapter-unavailable" && current !== "no-web-bluetooth";
    this.state.update({ status: keep ? current : support, connectEnabled: support === "supported" });
  }
}
