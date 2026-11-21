// Test helper: "F0 A4 00 94" to bytes.
export function bytes(hex: string): Uint8Array {
  const trimmed = hex.trim();
  return trimmed === "" ? new Uint8Array(0) : Uint8Array.from(trimmed.split(/\s+/), (pair) => parseInt(pair, 16));
}
