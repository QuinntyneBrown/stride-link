// The in-memory packet log of a page session (L2-037, L2-039..041, L2-057).
// Entries are append-only; each run gets its own section, and events outside any
// run (a cancelled chooser, a security error) go to the page section.
import type { ErrorFacts } from "../protocol/errors.ts";
import type { NotifyChar } from "../protocol/uuids.ts";
import type { ModelVariant } from "../protocol/variant.ts";
import type { Clock } from "./clock.ts";
import type { VerdictRecord } from "./verdict-types.ts";

export type FrameTag = "init" | "unlock response" | "activation" | "keepalive" | "echo" | "belt";
export type RxNote = "malformed" | "unknown";

export type LogEntry =
  | { readonly dir: "TX"; readonly t: number; readonly bytes: Uint8Array; readonly tag: FrameTag; readonly error?: ErrorFacts }
  | { readonly dir: "RX"; readonly t: number; readonly char: NotifyChar; readonly bytes: Uint8Array; readonly note?: RxNote }
  | { readonly dir: "EV"; readonly t: number; readonly text: string };

export interface RunInfo {
  readonly number: number;
  readonly deviceName: string;
  readonly variant: ModelVariant;
  readonly startedAtIso: string;
  readonly startedAt: number;
}

export interface LogSection {
  readonly run: RunInfo | null;
  readonly entries: readonly LogEntry[];
  readonly verdict: VerdictRecord | null;
}

export interface LogSnapshot {
  readonly entryCount: number;
  readonly sections: readonly LogSection[];
}

interface MutableSection {
  readonly run: RunInfo | null;
  readonly entries: LogEntry[];
  verdict: VerdictRecord | null;
}

export type LogListener = (entry: LogEntry, section: LogSection) => void;

export class PacketLog {
  private readonly clock: Clock;
  private readonly pageSection: MutableSection = { run: null, entries: [], verdict: null };
  private readonly sections: MutableSection[] = [this.pageSection];
  private current: MutableSection = this.pageSection;
  private count = 0;
  private exported = 0;
  private readonly listeners = new Set<LogListener>();
  readonly pageStartedAtIso: string;

  constructor(clock: Clock) {
    this.clock = clock;
    this.pageStartedAtIso = new Date(clock.wallTime() - clock.now()).toISOString();
  }

  get entryCount(): number {
    return this.count;
  }

  get runCount(): number {
    return this.sections.length - 1;
  }

  /** The device of the latest run, for the export file name. */
  get latestDeviceName(): string | null {
    return this.current.run?.deviceName ?? null;
  }

  onEntry(listener: LogListener): void {
    this.listeners.add(listener);
  }

  startRun(deviceName: string, variant: ModelVariant): RunInfo {
    const run: RunInfo = {
      number: this.sections.length,
      deviceName,
      variant,
      startedAtIso: new Date(this.clock.wallTime()).toISOString(),
      startedAt: this.clock.now(),
    };
    this.current = { run, entries: [], verdict: null };
    this.sections.push(this.current);
    return run;
  }

  /** Later entries outside a run go to the page section again. */
  endRun(): void {
    this.current = this.pageSection;
  }

  recordTx(bytes: Uint8Array, tag: FrameTag, error?: ErrorFacts): void {
    this.append(error ? { dir: "TX", t: this.elapsed(), bytes: copy(bytes), tag, error } : { dir: "TX", t: this.elapsed(), bytes: copy(bytes), tag });
  }

  recordRx(char: NotifyChar, bytes: Uint8Array, note?: RxNote): void {
    this.append(note ? { dir: "RX", t: this.elapsed(), char, bytes: copy(bytes), note } : { dir: "RX", t: this.elapsed(), char, bytes: copy(bytes) });
  }

  recordEvent(text: string): void {
    this.append({ dir: "EV", t: this.elapsed(), text });
  }

  setVerdict(record: VerdictRecord): void {
    this.current.verdict = record;
  }

  hasUnexported(): boolean {
    return this.count > this.exported;
  }

  snapshot(): LogSnapshot {
    // Entries are append-only, so a slice taken now is a stable view.
    return {
      entryCount: this.count,
      sections: this.sections.map((s) => ({ run: s.run, entries: s.entries.slice(), verdict: s.verdict })),
    };
  }

  markExported(entryCount: number): void {
    this.exported = Math.max(this.exported, entryCount);
  }

  private elapsed(): number {
    return this.clock.now() - (this.current.run?.startedAt ?? 0);
  }

  private append(entry: LogEntry): void {
    this.current.entries.push(entry);
    this.count += 1;
    for (const listener of this.listeners) listener(entry, this.current);
  }
}

function copy(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes);
}
