// Decides the run's verdict from init completion, notifications, unlock outcomes
// and disconnection (L2-033..035).
import type { Run } from "./run.ts";
import type { UnlockOutcome } from "./unlock-flow.ts";
import { verdictWord, type Verdict, type VerdictRecord } from "./verdict-types.ts";

export const SETTLE_MS = 3_000;
export const SILENT_MS = 20_000;
export const SILENT_REASON = "no notification within 20 s of init";

export class VerdictEngine {
  private readonly run: Run;
  private readonly publish: (record: VerdictRecord) => void;
  private record: VerdictRecord | null = null;
  private initStarted = false;
  private initComplete = false;
  private settled = false;
  private notifications = 0;
  private challengeSeen = false;

  constructor(run: Run, publish: (record: VerdictRecord) => void) {
    this.run = run;
    this.publish = publish;
  }

  get current(): VerdictRecord | null {
    return this.record;
  }

  onInitStarted(): void {
    this.initStarted = true;
  }

  onInitComplete(): void {
    this.initComplete = true;
    this.run.after(SETTLE_MS, () => {
      this.settled = true;
      if (this.notifications > 0 && !this.challengeSeen) this.conclude({ verdict: "talks" });
    });
    this.run.after(SILENT_MS, () => {
      if (this.notifications === 0) this.conclude({ verdict: "silent", reason: SILENT_REASON });
    });
  }

  /** Every notification. An E0 goes to the unlock flow instead of deciding Talks. */
  onNotification(isE0: boolean): void {
    this.notifications += 1;
    if (this.initComplete && this.settled && !isE0 && !this.challengeSeen) this.conclude({ verdict: "talks" });
  }

  onChallenge(): void {
    this.challengeSeen = true;
  }

  onUnlockOutcome(outcome: UnlockOutcome): void {
    this.decide(outcome.result === "unlocked" ? { verdict: "unlocked" } : { verdict: "locked", reason: outcome.reason ?? "" });
  }

  /** Before a verdict, still yields one of the four, from what has been seen (L2-035). */
  onDisconnect(awaitingAck: boolean): void {
    if (this.record !== null || !this.initStarted) return;
    if (awaitingAck) this.conclude({ verdict: "locked", reason: "disconnected before acknowledgement" });
    else if (this.notifications > 0) this.conclude({ verdict: "talks" });
    else this.conclude({ verdict: "silent", reason: "disconnected before any reply" });
  }

  /** First verdict only; Talks and Silent are decided once. */
  private conclude(record: VerdictRecord): void {
    if (this.record !== null) return;
    this.set(record);
  }

  /** Unlock outcomes replace any verdict except Silent, which is final (L2-033, L2-025). */
  private decide(record: VerdictRecord): void {
    if (this.record?.verdict === "silent") return;
    this.set(record);
  }

  private set(record: VerdictRecord): void {
    const previous = this.record;
    this.record = record;
    const log = this.run.log;
    if (previous && previous.verdict !== record.verdict) log.recordEvent(`Verdict changed: ${previous.verdict} -> ${record.verdict}`);
    log.recordEvent(`Verdict: ${describe(record)}`);
    log.setVerdict(record);
    this.publish(record);
  }
}

function describe(record: VerdictRecord): string {
  const word: string = verdictWord[record.verdict satisfies Verdict];
  return record.reason ? `${word} (${record.reason})` : word;
}
