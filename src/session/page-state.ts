// Everything the UI renders, as plain data owned by the session.
import type { SupportStatus } from "../ble/bluetooth-gateway.ts";

export type StatusKey =
  | "checking"
  | SupportStatus
  | "selecting"
  | "cancelled"
  | "bike-rejected"
  | "blocked-from-disk"
  | "chooser-failed"
  | "connecting"
  | "export-failed";

export interface DeviceFacts {
  readonly name: string;
  readonly variant: string;
}

export interface PageState {
  readonly status: StatusKey;
  readonly connectEnabled: boolean;
  readonly device: DeviceFacts | null;
  readonly canExport: boolean;
}

export const initialPageState: PageState = {
  status: "checking",
  connectEnabled: false,
  device: null,
  canExport: false,
};
