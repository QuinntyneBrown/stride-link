// The fixed, diff-friendly log line: "<ms> <DIR> <char> <hex> <tag>" (L2-038).
import { toHex } from "../protocol/hex.ts";
import type { LogEntry } from "./packet-log.ts";

export function formatMs(t: number): string {
  return Math.max(0, t).toFixed(1).padStart(10, " ");
}

export function formatEntry(entry: LogEntry): string {
  const ms = formatMs(entry.t);
  switch (entry.dir) {
    case "TX": {
      const base = `${ms} TX f2 ${toHex(entry.bytes)} ${entry.tag}`;
      return entry.error ? `${base} write failed ${entry.error.name}: ${entry.error.message}` : base;
    }
    case "RX": {
      const hex = entry.bytes.length === 0 ? "(empty)" : toHex(entry.bytes);
      return entry.note ? `${ms} RX ${entry.char} ${hex} ${entry.note}` : `${ms} RX ${entry.char} ${hex}`;
    }
    case "EV":
      return `${ms} EV ${entry.text}`;
  }
}
