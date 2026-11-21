// ck = sum of all preceding bytes, modulo 256 (L2-013).

export function checksum(bytes: Uint8Array | readonly number[]): number {
  let sum = 0;
  for (const byte of bytes) sum = (sum + byte) & 0xff;
  return sum;
}

/** The last byte equals the checksum of the bytes before it. Under 3 bytes is invalid. */
export function hasValidChecksum(frame: Uint8Array): boolean {
  if (frame.length < 3) return false;
  return checksum(frame.subarray(0, frame.length - 1)) === frame[frame.length - 1];
}
