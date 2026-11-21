// The page's only door to navigator.bluetooth (AGENTS.md, L2-002..004, L2-006).
import type { ChooserOptions } from "../protocol/chooser-filters.ts";

export type SupportStatus = "supported" | "no-web-bluetooth" | "adapter-unavailable";

export class BluetoothGateway {
  private readonly bluetooth: Bluetooth | undefined;

  constructor(bluetooth: Bluetooth | undefined) {
    this.bluetooth = bluetooth;
  }

  static fromNavigator(): BluetoothGateway {
    return new BluetoothGateway((navigator as { bluetooth?: Bluetooth }).bluetooth);
  }

  /** Calls nothing but getAvailability(), so loading the page never opens a chooser. */
  async checkSupport(): Promise<SupportStatus> {
    if (!this.bluetooth) return "no-web-bluetooth";
    try {
      return (await this.bluetooth.getAvailability()) ? "supported" : "adapter-unavailable";
    } catch {
      return "adapter-unavailable";
    }
  }

  onAvailabilityChanged(listener: (available: boolean) => void): void {
    this.bluetooth?.addEventListener("availabilitychanged", (event) => {
      listener((event as Event & { value?: unknown }).value === true);
    });
  }

  /** Opens the browser chooser. Call it straight from the Connect press (user gesture). */
  requestTreadmill(options: ChooserOptions): Promise<BluetoothDevice> {
    if (!this.bluetooth) return Promise.reject(new DOMException("Web Bluetooth is not available.", "NotSupportedError"));
    return this.bluetooth.requestDevice(options as unknown as RequestDeviceOptions);
  }
}
