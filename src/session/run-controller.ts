// Orchestrates the page session: support check, then runs (L2-002..004).
import type { BluetoothGateway, SupportStatus } from "../ble/bluetooth-gateway.ts";
import { initialPageState, type PageState } from "./page-state.ts";
import { Store } from "./store.ts";

export class RunController {
  readonly state = new Store<PageState>(initialPageState);
  private readonly gateway: BluetoothGateway;
  private support: SupportStatus | "checking" = "checking";

  constructor(gateway: BluetoothGateway) {
    this.gateway = gateway;
  }

  async boot(): Promise<void> {
    this.gateway.onAvailabilityChanged((available) => {
      if (this.support === "no-web-bluetooth") return;
      this.applySupport(available ? "supported" : "adapter-unavailable");
    });
    this.applySupport(await this.gateway.checkSupport());
  }

  private applySupport(support: SupportStatus): void {
    this.support = support;
    this.state.update({ status: support, connectEnabled: support === "supported" });
  }
}
