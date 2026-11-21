// Challenge/response arithmetic, credited to Christian Emerson via qdomyos-zwift
// (L2-020..024). From F0 E0 b2 b3 b4 b5 b6 ck:
//   a = leading decimal run of hex(b4)+hex(b2)
//   b = leading decimal run of hex(b3)+hex(b5)
//   c = leading decimal run of hex(b6)
//   auth = (a x b) mod c
import { hasValidChecksum } from "./checksum.ts";
import { bcd } from "./frame-encoder.ts";
import { toHex } from "./hex.ts";

export const CHALLENGE_LENGTH = 8;

export interface UnlockValues {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly auth: number;
}

export type ChallengeResult = { readonly ok: true; readonly values: UnlockValues } | { readonly ok: false; readonly reason: string };

/** The longest prefix made only of 0-9, as a base-10 integer, or null. */
export function leadingDecimal(digits: string): number | null {
  const match = /^[0-9]+/.exec(digits);
  return match ? Number.parseInt(match[0], 10) : null;
}

export function validateAuth(auth: number): string | null {
  return Number.isInteger(auth) && auth >= 0 && auth <= 99 ? null : "auth out of range";
}

/**
 * Checks an inbound E0 frame as a challenge and derives auth. Length is checked
 * before the checksum, so a 7- or 9-byte frame always reports its length (L2-020).
 */
export function solveChallenge(frame: Uint8Array): ChallengeResult {
  if (frame.length !== CHALLENGE_LENGTH) return { ok: false, reason: `challenge length ${frame.length}` };
  if (!hasValidChecksum(frame)) return { ok: false, reason: "challenge checksum invalid" };
  const hex = (index: number): string => toHex(frame.subarray(index, index + 1));
  const a = leadingDecimal(hex(4) + hex(2));
  if (a === null) return { ok: false, reason: "no decimal prefix in a" };
  const b = leadingDecimal(hex(3) + hex(5));
  if (b === null) return { ok: false, reason: "no decimal prefix in b" };
  const c = leadingDecimal(hex(6));
  if (c === null) return { ok: false, reason: "no decimal prefix in c" };
  if (c === 0) return { ok: false, reason: "zero divisor" };
  const auth = (a * b) % c;
  const invalid = validateAuth(auth);
  // c has at most two decimal digits, so auth is at most 98; the guard stays.
  /* v8 ignore next */
  if (invalid !== null) return { ok: false, reason: invalid };
  return { ok: true, values: { a, b, c, auth } };
}

/** An 8-byte F0 E0 frame with a valid checksum whose byte 4 is BCD(auth). */
export function isAcknowledgement(frame: Uint8Array, auth: number): boolean {
  return frame.length === CHALLENGE_LENGTH && frame[0] === 0xf0 && frame[1] === 0xe0 && hasValidChecksum(frame) && frame[4] === bcd(auth);
}
