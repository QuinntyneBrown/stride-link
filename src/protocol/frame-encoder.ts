// Every outbound Echelon frame, byte-exact (L2-014). Out-of-range arguments are
// programmer errors: tester input is validated before it reaches here.
import { checksum } from "./checksum.ts";
import type { ModelVariant } from "./variant.ts";

/** The smoke-test speed cap (L2-046). The encoder refuses anything faster. */
export const MAX_SPEED_KMH = 3;
export const MAX_INCLINE = 15;

export function frame(type: number, payload: readonly number[] = []): Uint8Array {
  const body = [0xf0, type, ...payload];
  return Uint8Array.from([...body, checksum(body)]);
}

const A4 = (): Uint8Array => frame(0xa4, [0x00]);
const A1 = (): Uint8Array => frame(0xa1, [0x00]);
const A3 = (): Uint8Array => frame(0xa3, [0x00]);
/** The Stride 4's fixed E0 init frame, F0 E0 FD 3E 65 48 D5 8D. */
const STRIDE4_E0 = (): Uint8Array => frame(0xe0, [0xfd, 0x3e, 0x65, 0x48, 0xd5]);

export function initSequence(variant: ModelVariant): Uint8Array[] {
  return variant === "stride4"
    ? [A4(), A4(), STRIDE4_E0(), A4(), A1(), A1(), A1(), A1(), A3()]
    : [A4(), A1(), A1(), A1(), A1(), A3(), A1()];
}

export function keepalive(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 1 || n > 255) throw new RangeError(`keepalive counter ${n} is outside 1 to 255`);
  return frame(0xa0, [0x01, n]);
}

/** BCD of a whole number 0..99: tens in the high nibble. */
export function bcd(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 99) throw new RangeError(`${value} is not a whole number from 0 to 99`);
  return (Math.floor(value / 10) << 4) | (value % 10);
}

export function unlockResponse(auth: number): Uint8Array {
  return frame(0xe0, [0x00, 0x00, bcd(auth), 0x00, 0x00]);
}

export function activation(): Uint8Array {
  return frame(0xb0, [0x01, 0x01]);
}

export function beltStop(): Uint8Array {
  return frame(0xb0, [0x01, 0x00]);
}

export function beltStart(variant: ModelVariant): Uint8Array[] {
  const common = [activation(), frame(0xd0, [0x01, 0x00]), frame(0xd0, [0x01, 0x11])];
  return variant === "stride4" ? [...common, frame(0xa5, [0x00]), frame(0xd3, [0x02, 0x01, 0xf4])] : common;
}

export function targetSpeed(kmh: number): Uint8Array {
  if (!Number.isFinite(kmh) || kmh < 0 || kmh > MAX_SPEED_KMH) throw new RangeError(`speed ${kmh} km/h is outside 0 to ${MAX_SPEED_KMH}`);
  const value = Math.round(kmh * 1000);
  return frame(0xb2, [0x02, value >> 8, value & 0xff]);
}

export function targetIncline(level: number): Uint8Array {
  if (!Number.isInteger(level) || level < 0 || level > MAX_INCLINE) throw new RangeError(`incline ${level} is outside 0 to ${MAX_INCLINE}`);
  return frame(0xb1, [0x01, level]);
}
