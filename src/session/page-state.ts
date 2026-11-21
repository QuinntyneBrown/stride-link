// Everything the UI renders, as plain data owned by the session.
import type { SupportStatus } from "../ble/bluetooth-gateway.ts";

export type StatusKey = "checking" | SupportStatus;

export interface PageState {
  readonly status: StatusKey;
  readonly connectEnabled: boolean;
}

export const initialPageState: PageState = {
  status: "checking",
  connectEnabled: false,
};
