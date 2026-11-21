// The unlock handshake for one run: challenge, response, activation 500 ms after
// the response resolves, and a 2.5 s acknowledgement window (L2-020..025).
import { activation, unlockResponse } from "../protocol/frame-encoder.ts";
import type { ParsedFrame } from "../protocol/frame-parser.ts";
import { toHex } from "../protocol/hex.ts";
import { isAcknowledgement, solveChallenge } from "../protocol/unlock.ts";
import type { Run } from "./run.ts";

export const ACTIVATION_DELAY_MS = 500;
export const ACK_WINDOW_MS = 2_500;
export const NO_ACK_REASON = "no acknowledgement within 2.5 s";

export interface UnlockOutcome {
  readonly attempt: number;
  readonly result: "unlocked" | "locked";
  readonly reason?: string;
}

export interface UnlockListener {
  /** A challenge arrived: Talks must not be declared for it (L2-034). */
  challengeSeen(): void;
  outcome(outcome: UnlockOutcome): void;
}

type State = { readonly kind: "idle" } | { readonly kind: "awaiting"; readonly attempt: number; readonly auth: number };

export class UnlockFlow {
  private readonly run: Run;
  private readonly listener: UnlockListener;
  private state: State = { kind: "idle" };
  private attempts = 0;
  private readonly windows = new Map<number, number>();

  constructor(run: Run, listener: UnlockListener) {
    this.run = run;
    this.listener = listener;
  }

  awaitingAck(): boolean {
    return this.state.kind === "awaiting";
  }

  /** Every inbound E0 frame comes here. */
  onE0(frame: ParsedFrame): void {
    const state = this.state;
    if (state.kind === "awaiting") {
      if (isAcknowledgement(frame.bytes, state.auth)) this.acknowledged(state.attempt);
      else this.run.log.recordEvent("E0 does not match auth");
      return;
    }
    this.challenge(frame);
  }

  private challenge(frame: ParsedFrame): void {
    this.attempts += 1;
    const attempt = this.attempts;
    const log = this.run.log;
    log.recordEvent(`Unlock attempt ${attempt}`);
    log.recordEvent(`Challenge ${toHex(frame.bytes)}`);
    this.listener.challengeSeen();
    const solved = solveChallenge(frame.bytes);
    if (!solved.ok) {
      this.conclude({ attempt, result: "locked", reason: solved.reason });
      return;
    }
    const { a, b, c, auth } = solved.values;
    log.recordEvent(`Unlock values a=${a} b=${b} c=${c} auth=${auth}`);
    const response = unlockResponse(auth);
    log.recordEvent(`Unlock response ${toHex(response)}`);
    this.state = { kind: "awaiting", attempt, auth };
    void this.run.write(response, "unlock response").then((outcome) => {
      if (!this.run.isAlive()) return;
      const current = this.isAwaiting(attempt);
      if (!outcome.ok) {
        if (current) this.conclude({ attempt, result: "locked", reason: "unlock response write failed" });
        return;
      }
      // Each attempt owns its timers. The activation is written even when the
      // acknowledgement came first; an acknowledgement cancels only its window.
      this.run.after(ACTIVATION_DELAY_MS, () => { void this.run.write(activation(), "activation"); });
      if (!current) return;
      this.windows.set(
        attempt,
        this.run.after(ACK_WINDOW_MS, () => {
          this.windows.delete(attempt);
          if (this.isAwaiting(attempt)) this.conclude({ attempt, result: "locked", reason: NO_ACK_REASON });
        }),
      );
    });
  }

  private isAwaiting(attempt: number): boolean {
    return this.state.kind === "awaiting" && this.state.attempt === attempt;
  }

  private acknowledged(attempt: number): void {
    this.run.log.recordEvent("Acknowledged");
    this.run.cancel(this.windows.get(attempt) ?? null);
    this.windows.delete(attempt);
    this.conclude({ attempt, result: "unlocked" });
  }

  private conclude(outcome: UnlockOutcome): void {
    this.state = { kind: "idle" };
    this.run.log.recordEvent(
      outcome.result === "unlocked" ? `Unlock attempt ${outcome.attempt}: unlocked` : `Unlock attempt ${outcome.attempt}: locked, ${outcome.reason ?? ""}`,
    );
    this.listener.outcome(outcome);
  }
}
