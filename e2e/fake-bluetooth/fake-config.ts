// Serializable description of a fake treadmill. It crosses from the test into the
// page as JSON, so it holds data only; behaviour lives in fake-bluetooth.ts.

export type CharName = "f2" | "f3" | "f4";

/** A notification the fake sends, `delayMs` after its trigger. */
export interface ScriptedNotification {
  char: "f3" | "f4";
  hex: string;
  delayMs: number;
}

/** When a write to f2 starts with `whenHexStartsWith`, the fake sends `notify`. */
export interface Reply {
  whenHexStartsWith: string;
  notify: ScriptedNotification[];
  /** Reply only to the first matching write. */
  once?: boolean;
}

export interface FakeConfig {
  /** "absent" removes navigator.bluetooth entirely. */
  availability: boolean | "absent";
  /** What requestDevice does: resolve the device, or reject with a DOMException name. */
  chooser: "select" | "NotFoundError" | "SecurityError";
  /** Advertised device name; null for an unnamed device. */
  deviceName: string | null;
  /** "hang" never resolves gatt.connect(); "late" resolves it after `lateConnectMs`. */
  connect: "ok" | "hang" | "late";
  lateConnectMs: number;
  /** Whether the Echelon service exists. */
  service: boolean;
  /** Characteristic whose startNotifications() rejects. */
  subscribeFailure: "f3" | "f4" | null;
  /** f2 properties.write; false means write-without-response only. */
  f2Write: boolean;
  /** Simulated GATT write latency. */
  writeLatencyMs: number;
  /** 1-based indices of f2 writes that reject with NetworkError, or "all". */
  failWrites: number[] | "all";
  /** 1-based indices of f2 writes whose hex starts with a prefix that reject, e.g. Stop. */
  failWritesStartingWith: string | null;
  replies: Reply[];
  /** Notifications sent once both subscriptions are on, relative to that moment. */
  onSubscribed: ScriptedNotification[];
  /** Drop the connection this long after the nth f2 write settles. */
  disconnectAfterWrite: { write: number; delayMs: number } | null;
}

export const baseConfig: FakeConfig = {
  availability: true,
  chooser: "select",
  deviceName: "STRIDE-8S",
  connect: "ok",
  lateConnectMs: 15_000,
  service: true,
  subscribeFailure: null,
  f2Write: true,
  writeLatencyMs: 5,
  failWrites: [],
  failWritesStartingWith: null,
  replies: [],
  onSubscribed: [],
  disconnectAfterWrite: null,
};

/** What the fake exposes to tests through `window.__fakeBluetooth`. */
export interface FakeWrite {
  t: number;
  char: CharName;
  hex: string;
  method: "withResponse" | "withoutResponse";
  ok: boolean;
}

export interface FakeCall {
  t: number;
  name: string;
  detail: string;
}

export interface FakeSnapshot {
  writes: FakeWrite[];
  calls: FakeCall[];
  notifications: { t: number; char: "f3" | "f4"; hex: string }[];
  overlaps: number;
  realRequestDeviceReached: boolean;
  unhandledRejections: string[];
}
