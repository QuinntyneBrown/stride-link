// Belt-control strings, worded exactly as docs/specs/L2.md (L2-042..048).
import type { InclineInput, SpeedInput } from "../../protocol/belt-input.ts";

type InputError = Extract<SpeedInput, { ok: false }>["error"] | Extract<InclineInput, { ok: false }>["error"];

export const GATE_LABEL = "I am standing clear of the belt";
export const STOP_LABEL = "Stop belt";
export const STOP_FAILED = "Stop failed. Use the treadmill's stop button or safety key now.";
export const CONNECTION_LOST = "Connection lost. If the belt is moving, use the treadmill's stop button or safety key.";

export const inputErrors: Record<InputError, string> = {
  "speed-cap": "Speed is capped at 3 km/h for the smoke test.",
  "speed-range": "Enter a speed from 0 to 3 km/h.",
  "incline-range": "Enter a whole-number incline from 0 to 15.",
};
