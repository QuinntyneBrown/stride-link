// Traces to: L2-044, L2-056
import { describe, expect, it } from "vitest";
import { WriteQueue, type WriteOutcome } from "../../../src/ble/write-queue.ts";

interface Pending {
  bytes: number[];
  resolve: () => void;
  reject: (error: Error) => void;
}

function harness() {
  const started: Pending[] = [];
  const settled: { tag: string; ok: boolean }[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const queue = new WriteQueue<string>(
    (bytes) =>
      new Promise<void>((resolve, reject) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        const done = (fn: () => void) => () => { inFlight -= 1; fn(); };
        started.push({ bytes: Array.from(bytes), resolve: done(resolve), reject: (e) => { done(() => { reject(e); })(); } });
      }),
    (_bytes, tag, outcome) => { settled.push({ tag, ok: outcome.ok }); },
  );
  const flush = () => new Promise((r) => setTimeout(r, 0));
  return { queue, started, settled, flush, maxInFlight: () => maxInFlight };
}

describe("L2-056 serialised write queue", () => {
  it("writes X, Y, Z in order with one write in flight", async () => {
    const h = harness();
    const outcomes = [h.queue.enqueue(Uint8Array.of(1), "x"), h.queue.enqueue(Uint8Array.of(2), "y"), h.queue.enqueue(Uint8Array.of(3), "z")];
    for (let i = 0; i < 3; i += 1) {
      await h.flush();
      expect(h.started).toHaveLength(i + 1);
      h.started[i]?.resolve();
    }
    expect(await Promise.all(outcomes)).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(h.started.map((p) => p.bytes)).toEqual([[1], [2], [3]]);
    expect(h.maxInFlight()).toBe(1);
  });

  it("continues with the next write after a rejection", async () => {
    const h = harness();
    const first = h.queue.enqueue(Uint8Array.of(1), "x");
    const second = h.queue.enqueue(Uint8Array.of(2), "y");
    await h.flush();
    h.started[0]?.reject(Object.assign(new Error("GATT operation failed for unknown reason."), { name: "NetworkError" }));
    const outcome: WriteOutcome = await first;
    expect(outcome).toEqual({ ok: false, cancelled: false, error: { name: "NetworkError", message: "GATT operation failed for unknown reason." } });
    await h.flush();
    h.started[1]?.resolve();
    expect(await second).toEqual({ ok: true });
    expect(h.settled).toEqual([{ tag: "x", ok: false }, { tag: "y", ok: true }]);
  });

  it("treats a synchronous throw from the write as a failed write", async () => {
    const queue = new WriteQueue<string>(() => { throw new TypeError("boom"); }, () => undefined);
    expect(await queue.enqueue(Uint8Array.of(1), "x")).toEqual({ ok: false, cancelled: false, error: { name: "TypeError", message: "boom" } });
  });
});

describe("L2-044 Stop jumps the queue", () => {
  it("is written next after the in-flight write, ahead of five waiting writes", async () => {
    const h = harness();
    for (let i = 1; i <= 6; i += 1) void h.queue.enqueue(Uint8Array.of(i), "keepalive");
    await h.flush();
    expect(h.started).toHaveLength(1);
    void h.queue.enqueueFirst(Uint8Array.of(0xb0, 0x00), "belt");
    h.started[0]?.resolve();
    await h.flush();
    expect(h.started[1]?.bytes).toEqual([0xb0, 0x00]);
  });
});

describe("clearing the queue", () => {
  it("cancels waiting writes, closes the queue and never issues them", async () => {
    const h = harness();
    const inFlight = h.queue.enqueue(Uint8Array.of(1), "x");
    const waiting = h.queue.enqueue(Uint8Array.of(2), "y");
    await h.flush();
    h.queue.clear("disconnected");
    h.queue.clear("again");
    expect(await waiting).toEqual({ ok: false, cancelled: true, reason: "disconnected" });
    expect(await h.queue.enqueue(Uint8Array.of(3), "z")).toEqual({ ok: false, cancelled: true, reason: "disconnected" });
    h.started[0]?.resolve();
    expect(await inFlight).toEqual({ ok: true });
    await h.flush();
    expect(h.started).toHaveLength(1);
    expect(h.queue.pending).toBe(0);
  });
});
