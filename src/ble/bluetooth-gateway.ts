// The page's only door to navigator.bluetooth (AGENTS.md, L2-002..004, L2-006).
import type { ChooserOptions } from "../protocol/chooser-filters.ts";
import { CHARACTERISTICS, ECHELON_SERVICE, type CharName } from "../protocol/uuids.ts";
import { TreadmillLink, type Characteristics } from "./treadmill-link.ts";

export type SupportStatus = "supported" | "no-web-bluetooth" | "adapter-unavailable";
export type ConnectionFailureKind = "connect-failed" | "missing-service";
export type ConnectStep = "connected" | "service-found";

/** A connection step failed; `cause` is what the browser threw. */
export class ConnectionFailure extends Error {
  readonly kind: ConnectionFailureKind;
  override readonly cause: unknown;

  constructor(kind: ConnectionFailureKind, cause: unknown) {
    super(kind);
    this.name = "ConnectionFailure";
    this.kind = kind;
    this.cause = cause;
  }
}

export class BluetoothGateway {
  private readonly bluetooth: Bluetooth | undefined;
  /** Attempts whose cleanup is still pending, so a new attempt cannot race them. */
  private readonly pending = new WeakMap<BluetoothDevice, Promise<unknown>>();

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

  /**
   * Connects, finds the Echelon service and its f2, f3 and f4 characteristics
   * (L2-010). Aborting the signal abandons the attempt: a pending connection is
   * cancelled and a late one is disconnected before this rejects.
   */
  connect(device: BluetoothDevice, signal: AbortSignal, onStep: (step: ConnectStep) => void): Promise<TreadmillLink> {
    const previous = this.pending.get(device) ?? Promise.resolve();
    const attempt = previous.then(
      () => this.discover(device, signal, onStep),
      () => this.discover(device, signal, onStep),
    );
    const settled = attempt.catch(() => undefined);
    this.pending.set(device, settled);
    return attempt;
  }

  private async discover(device: BluetoothDevice, signal: AbortSignal, onStep: (step: ConnectStep) => void): Promise<TreadmillLink> {
    const gatt = device.gatt;
    if (!gatt) throw new ConnectionFailure("connect-failed", new DOMException("The device has no GATT server.", "NotSupportedError"));
    const abandon = (): void => { gatt.disconnect(); };
    signal.addEventListener("abort", abandon);
    const checkAbandoned = (): void => {
      if (signal.aborted) {
        gatt.disconnect();
        throw new DOMException("The connection attempt was abandoned.", "AbortError");
      }
    };
    try {
      checkAbandoned();
      let server: BluetoothRemoteGATTServer;
      try {
        server = await gatt.connect();
      } catch (error) {
        checkAbandoned();
        throw new ConnectionFailure("connect-failed", error);
      }
      checkAbandoned();
      onStep("connected");
      let service: BluetoothRemoteGATTService;
      try {
        service = await server.getPrimaryService(ECHELON_SERVICE);
      } catch (error) {
        checkAbandoned();
        throw new ConnectionFailure("missing-service", error);
      }
      checkAbandoned();
      onStep("service-found");
      const chars: Partial<Characteristics> = {};
      for (const name of Object.keys(CHARACTERISTICS) as CharName[]) {
        try {
          chars[name] = await service.getCharacteristic(CHARACTERISTICS[name]);
        } catch (error) {
          checkAbandoned();
          throw new ConnectionFailure("missing-service", error);
        }
        checkAbandoned();
      }
      return new TreadmillLink(device, chars as Characteristics);
    } finally {
      signal.removeEventListener("abort", abandon);
    }
  }
}
