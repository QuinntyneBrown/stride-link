// Writes the variant's init frames in order, pacing each on a reply or 300 ms,
// whichever comes first (L2-017..019).
import { initSequence } from "../protocol/frame-encoder.ts";
import type { Run } from "./run.ts";

export const INIT_PACING_MS = 300;

export type InitResult = { readonly status: "completed"; readonly failures: number } | { readonly status: "cancelled" };

export class InitSequencer {
  private readonly run: Run;
  private replySeen = false;
  private wake: (() => void) | null = null;

  constructor(run: Run) {
    this.run = run;
  }

  /** Called for every notification, including one that arrives mid-write. */
  notifyReceived(): void {
    this.replySeen = true;
    this.wake?.();
  }

  /** Read through a method: notifyReceived() may have set it during the await. */
  private hasReply(): boolean {
    return this.replySeen;
  }

  async start(): Promise<InitResult> {
    const frames = initSequence(this.run.variant);
    let failures = 0;
    for (const [index, frame] of frames.entries()) {
      this.replySeen = false;
      const outcome = await this.run.write(frame, "init");
      if (!this.run.isAlive()) return { status: "cancelled" };
      if (!outcome.ok) failures += 1;
      if (index === frames.length - 1) break;
      // A failed write waits the full 300 ms; a reply does not cut it short.
      if (outcome.ok && this.hasReply()) continue;
      const wait = this.run.wait(INIT_PACING_MS);
      this.wake = outcome.ok ? wait.wake : null;
      const how = await wait.done;
      this.wake = null;
      if (how === "cancelled" || !this.run.isAlive()) return { status: "cancelled" };
    }
    this.run.log.recordEvent(failures === 0 ? "Init complete" : `Init complete (${failures} of ${frames.length} writes failed)`);
    return { status: "completed", failures };
  }
}
