// Everything the UI renders, as plain data owned by the session.
import type { SupportStatus } from "../ble/bluetooth-gateway.ts";
import { idleBelt, type BeltView } from "./belt-controller.ts";
import type { VerdictRecord } from "./verdict-types.ts";

export type StatusKey =
  | "checking"
  | SupportStatus
  | "selecting"
  | "cancelled"
  | "bike-rejected"
  | "blocked-from-disk"
  | "chooser-failed"
  | "connecting"
  | "connect-timeout"
  | "missing-service"
  | "connect-failed"
  | "subscribe-failed"
  | "connected"
  | "initialising"
  | "awaiting-verdict"
  | "verdict"
  | "disconnected"
  | "export-failed";

export interface DeviceFacts {
  readonly name: string;
  readonly variant: string;
}

export interface Telemetry {
  readonly speedKmh: number | null;
  readonly incline: number | null;
  readonly heartRateBpm: number | null;
}

export const emptyTelemetry: Telemetry = { speedKmh: null, incline: null, heartRateBpm: null };

export interface PageState {
  readonly status: StatusKey;
  readonly connectEnabled: boolean;
  readonly device: DeviceFacts | null;
  readonly canExport: boolean;
  readonly disconnectVisible: boolean;
  readonly verdict: VerdictRecord | null;
  readonly telemetry: Telemetry;
  readonly belt: BeltView;
  /** Shown when the link drops with the belt active, until dismissed (L2-048). */
  readonly connectionLost: boolean;
}

export const initialPageState: PageState = {
  status: "checking",
  connectEnabled: false,
  device: null,
  canExport: false,
  disconnectVisible: false,
  verdict: null,
  telemetry: emptyTelemetry,
  belt: idleBelt,
  connectionLost: false,
};
