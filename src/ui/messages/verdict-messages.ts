// Verdict copy, worded exactly as docs/specs/L2.md (L2-036) and the PRD.
import type { Verdict } from "../../session/verdict-types.ts";

export interface VerdictCopy {
  readonly meaning: string;
  readonly nextStep: string;
}

export const verdictCopy: Record<Verdict, VerdictCopy> = {
  silent: { meaning: "No notification within 20 s of init", nextStep: "Export the log; capture the official app for comparison" },
  talks: { meaning: "Notifications arrive and no challenge was sent", nextStep: "Read telemetry; belt commands can be tried" },
  unlocked: { meaning: "Challenge answered and acknowledged", nextStep: "Read telemetry; belt commands can be tried" },
  locked: { meaning: "Challenge invalid or not acknowledged in 2.5 s", nextStep: "Export the log with the challenge bytes" },
};

export const NO_VALUE = "—";
