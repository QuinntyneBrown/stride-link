// Keeps the link alive from init complete until disconnection: a counting
// keepalive every 2,000 ms and a byte-for-byte echo of D0, D2 and D3 (L2-026, L2-027).
import { keepalive } from "../protocol/frame-encoder.ts";
import type { ParsedFrame } from "../protocol/frame-parser.ts";
import type { Run } from "./run.ts";

export const KEEPALIVE_INTERVAL_MS = 2_000;

export class LinkKeeper {
  private readonly run: Run;
  private counter = 0;
  private started = false;
  private nextDueAt = 0;

  constructor(run: Run) {
    this.run = run;
  }

  /** At init complete. A second call is a no-op, so there is only ever one timer. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.nextDueAt = this.run.now() + KEEPALIVE_INTERVAL_MS;
    this.schedule();
  }

  /** Every D0, D2 and D3, under every verdict and whatever its checksum. */
  onFrame(frame: ParsedFrame): void {
    if (frame.kind === "D0" || frame.kind === "D2" || frame.kind === "D3") void this.run.write(frame.bytes, "echo");
  }

  private schedule(): void {
    // Scheduled against a target time, so drift does not accumulate.
    this.run.after(Math.max(0, this.nextDueAt - this.run.now()), () => {
      this.counter = this.counter >= 255 ? 1 : this.counter + 1;
      void this.run.write(keepalive(this.counter), "keepalive");
      this.nextDueAt += KEEPALIVE_INTERVAL_MS;
      this.schedule();
    });
  }
}
