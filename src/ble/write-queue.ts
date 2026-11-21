// The single FIFO for writes to f2: at most one GATT write in flight, and only
// Stop may go to the front (L2-044, L2-056).
import { errorFacts, type ErrorFacts } from "../protocol/errors.ts";

export type WriteOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly cancelled: false; readonly error: ErrorFacts }
  | { readonly ok: false; readonly cancelled: true; readonly reason: string };

interface QueuedWrite<Tag> {
  readonly bytes: Uint8Array;
  readonly tag: Tag;
  readonly settle: (outcome: WriteOutcome) => void;
}

export type WriteSettled<Tag> = (bytes: Uint8Array, tag: Tag, outcome: WriteOutcome) => void;

export class WriteQueue<Tag> {
  private readonly write: (bytes: Uint8Array) => Promise<void>;
  private readonly onSettled: WriteSettled<Tag>;
  private readonly waiting: QueuedWrite<Tag>[] = [];
  private inFlight = false;
  private closedReason: string | null = null;

  constructor(write: (bytes: Uint8Array) => Promise<void>, onSettled: WriteSettled<Tag>) {
    this.write = write;
    this.onSettled = onSettled;
  }

  get pending(): number {
    return this.waiting.length;
  }

  enqueue(bytes: Uint8Array, tag: Tag): Promise<WriteOutcome> {
    return this.add(bytes, tag, false);
  }

  /** Ahead of every waiting write, behind the one in flight. Stop only. */
  enqueueFirst(bytes: Uint8Array, tag: Tag): Promise<WriteOutcome> {
    return this.add(bytes, tag, true);
  }

  /** Closes the queue for good and cancels every waiting write; unissued frames are not TX. */
  clear(reason: string): void {
    if (this.closedReason !== null) return;
    this.closedReason = reason;
    const cancelled = this.waiting.splice(0);
    for (const item of cancelled) item.settle({ ok: false, cancelled: true, reason });
  }

  private add(bytes: Uint8Array, tag: Tag, first: boolean): Promise<WriteOutcome> {
    if (this.closedReason !== null) return Promise.resolve({ ok: false, cancelled: true, reason: this.closedReason });
    return new Promise((settle) => {
      const item = { bytes: Uint8Array.from(bytes), tag, settle };
      if (first) this.waiting.unshift(item);
      else this.waiting.push(item);
      this.pump();
    });
  }

  private pump(): void {
    if (this.inFlight || this.closedReason !== null) return;
    const item = this.waiting.shift();
    if (!item) return;
    this.inFlight = true;
    let promise: Promise<void>;
    try {
      promise = this.write(item.bytes);
    } catch (error) {
      promise = Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
    promise.then(
      () => { this.done(item, { ok: true }); },
      (error: unknown) => { this.done(item, { ok: false, cancelled: false, error: errorFacts(error) }); },
    );
  }

  private done(item: QueuedWrite<Tag>, outcome: WriteOutcome): void {
    this.inFlight = false;
    this.onSettled(item.bytes, item.tag, outcome);
    item.settle(outcome);
    this.pump();
  }
}
