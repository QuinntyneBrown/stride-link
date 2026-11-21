// User-facing connection strings, worded exactly as docs/specs/L2.md.
import type { StatusKey } from "../../session/page-state.ts";

export const OWNERSHIP_NOTICE = "Use Stride Link only on a treadmill you own.";

export const statusMessages: Record<StatusKey, string> = {
  checking: "Checking Bluetooth…",
  supported: "Ready to connect.",
  "no-web-bluetooth": "This browser can't use Bluetooth. Open this file in Chrome or Edge.",
  "adapter-unavailable": "Bluetooth is off or unavailable on this device. Turn it on to continue.",
};
