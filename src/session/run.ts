// One run's resources: its log section, link, write queue and timers. Ending the
// run invalidates every timer callback and closes the queue (L2-012, L2-058).
import type { TreadmillLink } from "../ble/treadmill-link.ts";
import { WriteQueue, type WriteOutcome } from "../ble/write-queue.ts";
import type { ModelVariant } from "../protocol/variant.ts";
import type { Clock, TimerId } from "./clock.ts";
import { InitSequencer } from "./init-sequencer.ts";
import type { FrameTag, SectionLog } from "./packet-log.ts";
import { UnlockFlow, type UnlockListener } from "./unlock-flow.ts";

export class Run {
  readonly log: SectionLog;
  readonly variant: ModelVariant;
  readonly abort = new AbortController();
  readonly init: InitSequencer;
  readonly unlock: UnlockFlow;
  link: TreadmillLink | null = null;
  queue: WriteQueue<FrameTag> | null = null;
  private live = true;
  private readonly clock: Clock;
  private readonly timers = new Set<TimerId>();
  private readonly endListeners: (() => void)[] = [];

  constructor(log: SectionLog, variant: ModelVariant, clock: Clock, unlockListener: UnlockListener) {
    this.log = log;
    this.variant = variant;
    this.clock = clock;
    this.init = new InitSequencer(this);
    this.unlock = new UnlockFlow(this, unlockListener);
  }

  /** A method, not a getter, so callers re-check it after every await. */
  isAlive(): boolean {
    return this.live;
  }

  /** A timer that never fires once the run has ended. */
  after(ms: number, callback: () => void): TimerId {
    const id = this.clock.setTimeout(() => {
      this.timers.delete(id);
      if (this.live) callback();
    }, ms);
    this.timers.add(id);
    return id;
  }

  cancel(id: TimerId | null): void {
    if (id === null) return;
    this.clock.clearTimeout(id);
    this.timers.delete(id);
  }

  /** Runs once when the run ends, so pending waits can settle as cancelled. */
  onEnd(listener: () => void): void {
    if (this.live) this.endListeners.push(listener);
    else listener();
  }

  /**
   * Waits `ms`, or until `wake` is called, whichever comes first. Settles
   * "cancelled" if the run ends first.
   */
  wait(ms: number): { done: Promise<"elapsed" | "woken" | "cancelled">; wake: () => void } {
    let finish: (how: "elapsed" | "woken" | "cancelled") => void = () => undefined;
    const done = new Promise<"elapsed" | "woken" | "cancelled">((resolve) => {
      let settled = false;
      finish = (how) => {
        if (settled) return;
        settled = true;
        this.cancel(id);
        resolve(how);
      };
    });
    const id = this.after(ms, () => { finish("elapsed"); });
    this.onEnd(() => { finish("cancelled"); });
    return { done, wake: () => { finish("woken"); } };
  }

  /** Every write to f2 goes through the run's queue; TX is logged when it settles. */
  attach(link: TreadmillLink): void {
    this.link = link;
    this.queue = new WriteQueue<FrameTag>(
      (bytes) => link.write(bytes),
      (bytes, tag, outcome) => {
        if (!outcome.ok && outcome.cancelled) return;
        if (outcome.ok) this.log.recordTx(bytes, tag);
        else this.log.recordTx(bytes, tag, outcome.error);
      },
    );
  }

  write(bytes: Uint8Array, tag: FrameTag): Promise<WriteOutcome> {
    if (!this.queue) return Promise.resolve({ ok: false, cancelled: true, reason: "not connected" });
    return this.queue.enqueue(bytes, tag);
  }

  writeFirst(bytes: Uint8Array, tag: FrameTag): Promise<WriteOutcome> {
    if (!this.queue) return Promise.resolve({ ok: false, cancelled: true, reason: "not connected" });
    return this.queue.enqueueFirst(bytes, tag);
  }

  /** Idempotent. Returns false when the run had already ended. */
  end(reason: string): boolean {
    if (!this.live) return false;
    this.live = false;
    this.abort.abort();
    for (const id of this.timers) this.clock.clearTimeout(id);
    this.timers.clear();
    this.queue?.clear(reason);
    for (const listener of this.endListeners.splice(0)) listener();
    return true;
  }
}
