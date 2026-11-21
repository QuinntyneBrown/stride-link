// Validates the tester's speed and incline entries before any frame is built
// (L2-046, L2-047). The 3 km/h cap is enforced here and again in the encoder.
import { MAX_INCLINE, MAX_SPEED_KMH } from "./frame-encoder.ts";

export type SpeedInput = { readonly ok: true; readonly kmh: number } | { readonly ok: false; readonly error: "speed-range" | "speed-cap" };
export type InclineInput = { readonly ok: true; readonly level: number } | { readonly ok: false; readonly error: "incline-range" };

export function parseSpeed(raw: string): SpeedInput {
  const text = raw.trim();
  const kmh = Number(text);
  if (text === "" || !Number.isFinite(kmh) || kmh < 0) return { ok: false, error: "speed-range" };
  if (kmh > MAX_SPEED_KMH) return { ok: false, error: "speed-cap" };
  return { ok: true, kmh };
}

export function parseIncline(raw: string): InclineInput {
  const text = raw.trim();
  const level = Number(text);
  if (text === "" || !Number.isInteger(level) || level < 0 || level > MAX_INCLINE) return { ok: false, error: "incline-range" };
  return { ok: true, level };
}
