// One GATT connection to a Stride: the device and its f2, f3 and f4
// characteristics (L2-010..012, L2-056).
import { CHARACTERISTICS, type CharName, type NotifyChar } from "../protocol/uuids.ts";

export type WriteMethod = "writeValueWithResponse" | "writeValueWithoutResponse";
export type Characteristics = Record<CharName, BluetoothRemoteGATTCharacteristic>;

const NOTIFY_CHARS: readonly NotifyChar[] = ["f3", "f4"];

export class TreadmillLink {
  readonly writeMethod: WriteMethod;
  private readonly device: BluetoothDevice;
  private readonly chars: Characteristics;
  private readonly notifying = new Set<NotifyChar>();
  private notificationCleanups: (() => void)[] = [];
  private disconnectCleanup: (() => void) | null = null;

  constructor(device: BluetoothDevice, chars: Characteristics) {
    this.device = device;
    this.chars = chars;
    this.writeMethod = chars.f2.properties.write ? "writeValueWithResponse" : "writeValueWithoutResponse";
  }

  /** One line per characteristic: name, UUID and properties (L2-010). */
  describeCharacteristics(): string[] {
    return (Object.keys(CHARACTERISTICS) as CharName[]).map((name) => {
      const p = this.chars[name].properties;
      const props = (["read", "write", "writeWithoutResponse", "notify", "indicate"] as const).filter((key) => p[key]);
      return `Characteristic ${name} ${this.chars[name].uuid} properties: ${props.join(", ") || "none"}`;
    });
  }

  /** Installed before subscription, so a drop during it still tears the run down. */
  onDisconnected(listener: () => void): void {
    const handler = (): void => { listener(); };
    this.device.addEventListener("gattserverdisconnected", handler);
    this.disconnectCleanup = () => { this.device.removeEventListener("gattserverdisconnected", handler); };
  }

  /**
   * Starts notifications on f3, then f4. Listeners go on first, so nothing that
   * arrives during subscription is lost. Bytes are copied out of the DataView
   * before the callback runs (L2-011, L2-015).
   */
  async subscribe(onFrame: (char: NotifyChar, bytes: Uint8Array) => void): Promise<void> {
    for (const name of NOTIFY_CHARS) {
      const char = this.chars[name];
      const handler = (): void => {
        const view = char.value;
        onFrame(name, view ? Uint8Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength)) : new Uint8Array(0));
      };
      char.addEventListener("characteristicvaluechanged", handler);
      this.notificationCleanups.push(() => { char.removeEventListener("characteristicvaluechanged", handler); });
    }
    try {
      for (const name of NOTIFY_CHARS) {
        await this.chars[name].startNotifications();
        this.notifying.add(name);
      }
    } catch (error) {
      this.removeNotificationListeners();
      throw error;
    }
  }

  isNotifying(char: NotifyChar): boolean {
    return this.notifying.has(char);
  }

  write(bytes: Uint8Array): Promise<void> {
    const f2 = this.chars.f2;
    const data = Uint8Array.from(bytes);
    return this.writeMethod === "writeValueWithResponse" ? f2.writeValueWithResponse(data) : f2.writeValueWithoutResponse(data);
  }

  disconnect(): void {
    if (this.device.gatt?.connected) this.device.gatt.disconnect();
  }

  /** Removes every listener; the link is finished with. */
  dispose(): void {
    this.removeNotificationListeners();
    this.disconnectCleanup?.();
    this.disconnectCleanup = null;
  }

  private removeNotificationListeners(): void {
    for (const cleanup of this.notificationCleanups) cleanup();
    this.notificationCleanups = [];
    this.notifying.clear();
  }
}
