// User-facing connection strings, worded exactly as docs/specs/L2.md.
import type { StatusKey } from "../../session/page-state.ts";

export const OWNERSHIP_NOTICE = "Use Stride Link only on a treadmill you own.";

export const statusMessages: Record<StatusKey, string> = {
  checking: "Checking Bluetooth…",
  supported: "Ready to connect.",
  "no-web-bluetooth": "This browser can't use Bluetooth. Open this file in Chrome or Edge.",
  "adapter-unavailable": "Bluetooth is off or unavailable on this device. Turn it on to continue.",
  selecting: "Choose your treadmill in the browser's list.",
  cancelled: "No treadmill selected.",
  "bike-rejected": "This looks like an Echelon bike. Stride Link only tests Stride treadmills.",
  "blocked-from-disk": "This browser blocks Bluetooth on files opened from disk. Open the hosted copy instead.",
  "chooser-failed": "Couldn't open the Bluetooth chooser. Press Connect to try again.",
  connecting: "Connecting to the treadmill…",
  "connect-timeout": "Couldn't connect within 10 seconds. Move closer to the treadmill and try again.",
  "missing-service": "This device doesn't expose the Echelon service. Is it a Stride?",
  "connect-failed": "Couldn't connect to the treadmill. Move closer and press Connect to try again.",
  "subscribe-failed": "Couldn't turn on treadmill notifications.",
  connected: "Connected to the treadmill.",
  disconnected: "Disconnected",
  "export-failed": "Couldn't save the log file. Press Export log to try again.",
};

export const HOSTED_LINK_TEXT = "Open the hosted copy";
