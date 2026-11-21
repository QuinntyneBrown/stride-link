// The belt for one run: the opt-in gate, Start, Stop, speed and incline, and
// whether the belt counts as active (L2-042..048). Belt commands are refused
// unless the gate is offered and open; Stop is never refused.
import type { WriteOutcome } from "../ble/write-queue.ts";
import { parseIncline, parseSpeed, type InclineInput, type SpeedInput } from "../protocol/belt-input.ts";
import { beltStart, beltStop, targetIncline, targetSpeed } from "../protocol/frame-encoder.ts";
import type { Run } from "./run.ts";
import type { Verdict } from "./verdict-types.ts";

export interface BeltView {
  readonly gateOffered: boolean;
  readonly gateOpen: boolean;
  readonly active: boolean;
  readonly stopFailed: boolean;
}

export const idleBelt: BeltView = { gateOffered: false, gateOpen: false, active: false, stopFailed: false };

export class BeltController {
  private readonly run: Run;
  private readonly changed: () => void;
  private gateOffered = false;
  private gateOpen = false;
  private startRequested = false;
  private speedKmh: number | null = null;
  private speedUpdates = 0;
  private stopFailed = false;

  constructor(run: Run, changed: () => void) {
    this.run = run;
    this.changed = changed;
  }

  view(): BeltView {
    return { gateOffered: this.gateOffered, gateOpen: this.gateOpen, active: this.isActive(), stopFailed: this.stopFailed };
  }

  /** Active after Start, or whenever the treadmill reports a speed above 0 (L2-045). */
  isActive(): boolean {
    return this.startRequested || (this.speedKmh !== null && this.speedKmh > 0);
  }

  /** Only Talks and Unlocked offer the gate; any other verdict closes it. */
  onVerdict(verdict: Verdict): void {
    this.gateOffered = verdict === "talks" || verdict === "unlocked";
    if (!this.gateOffered && this.gateOpen) {
      this.gateOpen = false;
      this.run.log.recordEvent("Belt gate closed");
    }
    this.changed();
  }

  setGate(open: boolean): void {
    if (!this.gateOffered || open === this.gateOpen) return;
    this.gateOpen = open;
    this.run.log.recordEvent(open ? "Belt gate opened" : "Belt gate closed");
    this.changed();
  }

  onSpeed(kmh: number): void {
    this.speedKmh = kmh;
    this.speedUpdates += 1;
    this.changed();
  }

  start(): void {
    if (!this.commandsAllowed()) return;
    this.run.log.recordEvent("Belt start requested");
    this.startRequested = true;
    for (const frame of beltStart(this.run.variant)) void this.run.write(frame, "belt");
    this.changed();
  }

  /** Stop goes ahead of every waiting write; the write in flight finishes first (L2-044). */
  stop(): Promise<WriteOutcome> {
    this.run.log.recordEvent("Belt stop requested");
    const mark = this.speedUpdates;
    const outcome = this.run.writeFirst(beltStop(), "belt");
    void outcome.then((result) => {
      if (!this.run.isAlive()) return;
      if (result.ok) {
        this.run.log.recordEvent("Belt stop written");
        this.startRequested = false;
        this.stopFailed = false;
        // Active again only if the treadmill reports a speed above 0 after Stop.
        if (this.speedUpdates === mark) this.speedKmh = null;
      } else {
        this.run.log.recordEvent(result.cancelled ? `Belt stop not written: ${result.reason}` : `Belt stop failed ${result.error.name}: ${result.error.message}`);
        this.stopFailed = true;
      }
      this.changed();
    });
    return outcome;
  }

  setSpeed(raw: string): SpeedInput {
    const input = parseSpeed(raw);
    if (input.ok && this.commandsAllowed()) {
      this.run.log.recordEvent(`Belt speed requested ${input.kmh} km/h`);
      void this.run.write(targetSpeed(input.kmh), "belt");
    }
    return input;
  }

  setIncline(raw: string): InclineInput {
    const input = parseIncline(raw);
    if (input.ok && this.commandsAllowed()) {
      this.run.log.recordEvent(`Belt incline requested ${input.level}`);
      void this.run.write(targetIncline(input.level), "belt");
    }
    return input;
  }

  private commandsAllowed(): boolean {
    return this.gateOffered && this.gateOpen && this.run.isAlive();
  }
}
