// Fake navigator.bluetooth. Bundled to an IIFE and installed with addInitScript
// before any page script runs (L2-070). It records every call and write, detects
// overlapping GATT writes, and plays a scripted treadmill on the page clock.
// It runs before Playwright installs its clock, so it keeps the real clock to
// measure how long the page's notification handler takes (L2-055).
const realNow = performance.now.bind(performance);
import type { CharName, FakeCall, FakeConfig, FakeSnapshot, FakeWrite, ScriptedNotification } from "./fake-config.ts";

const SERVICE = "0bf669f1-45f2-11e7-9598-0800200c9a66";
const CHAR_UUIDS: Record<CharName, string> = {
  f2: "0bf669f2-45f2-11e7-9598-0800200c9a66",
  f3: "0bf669f3-45f2-11e7-9598-0800200c9a66",
  f4: "0bf669f4-45f2-11e7-9598-0800200c9a66",
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

function fromHex(hex: string): Uint8Array {
  const parts = hex.trim() === "" ? [] : hex.trim().split(/\s+/);
  return Uint8Array.from(parts, (p) => parseInt(p, 16));
}

function domError(name: string, message: string): DOMException {
  return new DOMException(message, name);
}

class FakeCharacteristic extends EventTarget {
  readonly uuid: string;
  readonly properties: { write: boolean; writeWithoutResponse: boolean; notify: boolean };
  value: DataView | null = null;
  readonly name: CharName;
  private readonly fake: FakeBluetooth;

  constructor(fake: FakeBluetooth, name: CharName) {
    super();
    this.fake = fake;
    this.name = name;
    this.uuid = CHAR_UUIDS[name];
    const isWrite = name === "f2";
    this.properties = {
      write: isWrite && fake.config.f2Write,
      writeWithoutResponse: isWrite,
      notify: !isWrite,
    };
  }

  startNotifications(): Promise<FakeCharacteristic> {
    return this.fake.startNotifications(this);
  }

  stopNotifications(): Promise<FakeCharacteristic> {
    this.fake.call("stopNotifications", this.name);
    return Promise.resolve(this);
  }

  writeValueWithResponse(value: BufferSource): Promise<void> {
    return this.fake.write(this, value, "withResponse");
  }

  writeValueWithoutResponse(value: BufferSource): Promise<void> {
    return this.fake.write(this, value, "withoutResponse");
  }

  writeValue(value: BufferSource): Promise<void> {
    return this.fake.write(this, value, "withResponse");
  }

  notify(bytes: Uint8Array): void {
    // A view at an offset into a larger buffer, as browsers may deliver it.
    const buffer = new ArrayBuffer(bytes.length + 8);
    new Uint8Array(buffer).fill(0xee);
    new Uint8Array(buffer, 4, bytes.length).set(bytes);
    this.value = new DataView(buffer, 4, bytes.length);
    this.dispatchEvent(new Event("characteristicvaluechanged"));
  }
}

class FakeService {
  readonly uuid = SERVICE;
  private readonly fake: FakeBluetooth;

  constructor(fake: FakeBluetooth) {
    this.fake = fake;
  }

  getCharacteristic(uuid: string): Promise<FakeCharacteristic> {
    this.fake.call("getCharacteristic", uuid);
    const entry = (Object.keys(CHAR_UUIDS) as CharName[]).find((name) => CHAR_UUIDS[name] === uuid);
    if (!entry) return Promise.reject(domError("NotFoundError", `No Characteristics matching UUID ${uuid} found in Service.`));
    return Promise.resolve(this.fake.chars[entry]);
  }
}

class FakeGatt {
  connected = false;
  readonly device: FakeDevice;
  private readonly fake: FakeBluetooth;

  constructor(fake: FakeBluetooth, device: FakeDevice) {
    this.fake = fake;
    this.device = device;
  }

  connect(): Promise<FakeGatt> {
    this.fake.call("gatt.connect", "");
    const { connect, lateConnectMs } = this.fake.config;
    if (connect === "hang") return new Promise<FakeGatt>(() => undefined);
    return new Promise((resolve) => {
      setTimeout(
        () => {
          this.connected = true;
          resolve(this);
        },
        connect === "late" ? lateConnectMs : 20,
      );
    });
  }

  disconnect(): void {
    this.fake.call("gatt.disconnect", "");
    this.fake.dropConnection();
  }

  getPrimaryService(uuid: string): Promise<FakeService> {
    this.fake.call("getPrimaryService", uuid);
    if (!this.connected) return Promise.reject(domError("NetworkError", "GATT Server is disconnected."));
    if (!this.fake.config.service || uuid !== SERVICE) {
      return Promise.reject(domError("NotFoundError", `No Services matching UUID ${uuid} found in Device.`));
    }
    return Promise.resolve(new FakeService(this.fake));
  }
}

class FakeDevice extends EventTarget {
  readonly id = "fake-device-1";
  readonly name: string | undefined;
  readonly gatt: FakeGatt;

  constructor(fake: FakeBluetooth, name: string | null) {
    super();
    this.name = name ?? undefined;
    this.gatt = new FakeGatt(fake, this);
  }
}

class FakeBluetooth extends EventTarget {
  readonly config: FakeConfig;
  readonly chars: Record<CharName, FakeCharacteristic>;
  readonly device: FakeDevice;
  readonly writes: FakeWrite[] = [];
  readonly calls: FakeCall[] = [];
  readonly notifications: FakeSnapshot["notifications"] = [];
  readonly unhandledRejections: string[] = [];
  /** Real milliseconds each notification's synchronous dispatch took. */
  readonly handlerMs: number[] = [];
  realRequestDeviceReached = false;
  overlaps = 0;
  private inFlight = 0;
  private subscribed = new Set<CharName>();
  private usedReplies = new Set<number>();

  constructor(config: FakeConfig) {
    super();
    this.config = config;
    this.chars = { f2: new FakeCharacteristic(this, "f2"), f3: new FakeCharacteristic(this, "f3"), f4: new FakeCharacteristic(this, "f4") };
    this.device = new FakeDevice(this, config.deviceName);
  }

  call(name: string, detail: string): void {
    this.calls.push({ t: performance.now(), name, detail });
  }

  getAvailability(): Promise<boolean> {
    this.call("getAvailability", "");
    return Promise.resolve(this.config.availability === true);
  }

  getDevices(): Promise<FakeDevice[]> {
    this.call("getDevices", "");
    return Promise.resolve([]);
  }

  requestDevice(options: unknown): Promise<FakeDevice> {
    this.call("requestDevice", JSON.stringify(options));
    if (this.config.chooser === "NotFoundError") return Promise.reject(domError("NotFoundError", "User cancelled the requestDevice() chooser."));
    if (this.config.chooser === "SecurityError") {
      return Promise.reject(domError("SecurityError", "Origin is not allowed to access the service. Tip: Add the service UUID to 'optionalServices' in requestDevice() options."));
    }
    return Promise.resolve(this.device);
  }

  /** Test control: report a change of adapter availability. */
  setAvailability(value: boolean): void {
    this.config.availability = value;
    const event = new Event("availabilitychanged") as Event & { value: boolean };
    Object.defineProperty(event, "value", { value });
    this.dispatchEvent(event);
  }

  startNotifications(char: FakeCharacteristic): Promise<FakeCharacteristic> {
    this.call("startNotifications", char.name);
    if (this.config.subscribeFailure === char.name) {
      return Promise.reject(domError("NotSupportedError", "GATT operation failed for unknown reason."));
    }
    this.subscribed.add(char.name);
    if (this.subscribed.has("f3") && this.subscribed.has("f4")) this.schedule(this.config.onSubscribed);
    return Promise.resolve(char);
  }

  write(char: FakeCharacteristic, value: BufferSource, method: FakeWrite["method"]): Promise<void> {
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value.slice(0)) : new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    const hex = toHex(bytes);
    const t = performance.now();
    const realT = realNow();
    this.call(method === "withResponse" ? "writeValueWithResponse" : "writeValueWithoutResponse", hex);
    if (this.inFlight > 0) {
      this.overlaps += 1;
      this.writes.push({ t, realT, char: char.name, hex, method, ok: false });
      return Promise.reject(domError("NetworkError", "GATT operation already in progress."));
    }
    if (!this.device.gatt.connected) {
      this.writes.push({ t, realT, char: char.name, hex, method, ok: false });
      return Promise.reject(domError("NetworkError", "GATT Server is disconnected. Cannot perform GATT operations."));
    }
    const index = this.writes.length + 1;
    const record: FakeWrite = { t, realT, char: char.name, hex, method, ok: true };
    this.writes.push(record);
    this.inFlight += 1;
    const { failWrites, failWritesStartingWith } = this.config;
    const shouldFail = failWrites === "all" || failWrites.includes(index) || (failWritesStartingWith !== null && hex.startsWith(failWritesStartingWith));
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.inFlight -= 1;
        if (shouldFail) {
          record.ok = false;
          reject(domError("NetworkError", "GATT operation failed for unknown reason."));
        } else {
          resolve();
          this.react(hex);
        }
        const drop = this.config.disconnectAfterWrite;
        if (drop && drop.write === index) setTimeout(() => { this.dropConnection(); }, drop.delayMs);
      }, this.config.slowWrites && hex.startsWith(this.config.slowWrites.prefix) ? this.config.slowWrites.latencyMs : this.config.writeLatencyMs);
    });
  }

  private react(hex: string): void {
    this.config.replies.forEach((reply, index) => {
      if (!hex.startsWith(reply.whenHexStartsWith)) return;
      if (reply.once && this.usedReplies.has(index)) return;
      this.usedReplies.add(index);
      this.schedule(reply.notify);
    });
  }

  private schedule(list: ScriptedNotification[]): void {
    for (const n of list) setTimeout(() => { this.notify(n.char, n.hex); }, n.delayMs);
  }

  /** Test control: send one notification now. */
  notify(char: "f3" | "f4", hex: string): void {
    if (!this.device.gatt.connected || !this.subscribed.has(char)) return;
    this.notifications.push({ t: performance.now(), char, hex });
    const started = realNow();
    this.chars[char].notify(fromHex(hex));
    this.handlerMs.push(realNow() - started);
  }

  /** Test control: `count` notifications, one every `intervalMs`, on the page clock. */
  notifyEvery(char: "f3" | "f4", hex: string, intervalMs: number, count: number): void {
    let sent = 0;
    const next = (): void => {
      if (sent >= count) return;
      sent += 1;
      this.notify(char, hex);
      setTimeout(next, intervalMs);
    };
    setTimeout(next, intervalMs);
  }

  /** Real milliseconds, unaffected by the page clock. */
  realNow(): number {
    return realNow();
  }

  /** Test control: the treadmill drops the link. */
  dropConnection(): void {
    if (!this.device.gatt.connected) return;
    this.device.gatt.connected = false;
    this.subscribed.clear();
    this.call("gattserverdisconnected", "");
    this.device.dispatchEvent(new Event("gattserverdisconnected"));
  }

  snapshot(): FakeSnapshot {
    return {
      writes: this.writes.map((w) => ({ ...w })),
      calls: this.calls.map((c) => ({ ...c })),
      notifications: this.notifications.map((n) => ({ ...n })),
      overlaps: this.overlaps,
      realRequestDeviceReached: this.realRequestDeviceReached,
      unhandledRejections: [...this.unhandledRejections],
      handlerMs: [...this.handlerMs],
    };
  }
}

function install(config: FakeConfig): void {
  const fake = new FakeBluetooth(config);
  const realPrototype = (globalThis as { Bluetooth?: { prototype: { requestDevice?: unknown } } }).Bluetooth?.prototype;
  if (realPrototype) {
    // Any path to the real chooser is recorded and refused (L2-070).
    realPrototype.requestDevice = () => {
      fake.realRequestDeviceReached = true;
      return Promise.reject(new DOMException("Real requestDevice reached in a test.", "SecurityError"));
    };
  }
  Object.defineProperty(Navigator.prototype, "bluetooth", {
    configurable: true,
    get: () => (config.availability === "absent" ? undefined : fake),
  });
  if (config.availability === "absent") {
    // `"bluetooth" in navigator` must be false as well.
    delete (Navigator.prototype as { bluetooth?: unknown }).bluetooth;
  }
  window.addEventListener("unhandledrejection", (event) => {
    fake.unhandledRejections.push(String(event.reason));
  });
  Object.defineProperty(window, "__fakeBluetooth", { value: fake, configurable: false });
}

(globalThis as { __installFakeBluetooth?: (config: FakeConfig) => void }).__installFakeBluetooth = install;
