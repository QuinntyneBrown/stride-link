// Classifies any inbound byte array and never throws (L2-015). Bytes from the
// treadmill are untrusted.
import { hasValidChecksum } from "./checksum.ts";

export type FrameKind = "empty" | "unknown" | "D0" | "D1" | "D2" | "D3" | "E0" | "other";

export interface ParsedFrame {
  readonly kind: FrameKind;
  /** Byte 1 for an F0 frame, otherwise null. */
  readonly type: number | null;
  readonly bytes: Uint8Array;
  readonly checksumValid: boolean;
  /** Too short for its type's fields. */
  readonly malformed: boolean;
}

const KNOWN: Partial<Record<number, FrameKind>> = { 0xd0: "D0", 0xd1: "D1", 0xd2: "D2", 0xd3: "D3", 0xe0: "E0" };
const MIN_LENGTH: Partial<Record<FrameKind, number>> = { D3: 5, D2: 4, D0: 4 };

export function parseFrame(bytes: Uint8Array): ParsedFrame {
  if (bytes.length === 0) return { kind: "empty", type: null, bytes, checksumValid: false, malformed: false };
  const type = bytes[1];
  if (bytes[0] !== 0xf0 || type === undefined) return { kind: "unknown", type: null, bytes, checksumValid: false, malformed: false };
  const kind = KNOWN[type] ?? "other";
  return { kind, type, bytes, checksumValid: hasValidChecksum(bytes), malformed: bytes.length < (MIN_LENGTH[kind] ?? 0) };
}
