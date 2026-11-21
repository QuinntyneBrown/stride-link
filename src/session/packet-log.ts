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

export type LogListener = (entry: LogEntry, section: LogSection) => void;

/** Records into one section: the page's, or one run's. Times are relative to its start. */
export class SectionLog implements LogSection {
  readonly run: RunInfo | null;
  readonly entries: LogEntry[] = [];
  verdict: VerdictRecord | null = null;
  private readonly clock: Clock;
  private readonly origin: number;
  private readonly sink: (entry: LogEntry, section: SectionLog) => void;

  constructor(run: RunInfo | null, clock: Clock, sink: (entry: LogEntry, section: SectionLog) => void) {
    this.run = run;
    this.clock = clock;
    this.origin = run?.startedAt ?? 0;
    this.sink = sink;
  }

  recordTx(bytes: Uint8Array, tag: FrameTag, error?: ErrorFacts): void {
    const t = this.elapsed();
    this.append(error ? { dir: "TX", t, bytes: copy(bytes), tag, error } : { dir: "TX", t, bytes: copy(bytes), tag });
  }

  recordRx(char: NotifyChar, bytes: Uint8Array, note?: RxNote): void {
    const t = this.elapsed();
    this.append(note ? { dir: "RX", t, char, bytes: copy(bytes), note } : { dir: "RX", t, char, bytes: copy(bytes) });
  }

  recordEvent(text: string): void {
    this.append({ dir: "EV", t: this.elapsed(), text });
  }

  setVerdict(record: VerdictRecord): void {
    this.verdict = record;
  }

  private elapsed(): number {
    return this.clock.now() - this.origin;
  }

  private append(entry: LogEntry): void {
    this.entries.push(entry);
    this.sink(entry, this);
  }
}

export class PacketLog {
  readonly page: SectionLog;
  readonly pageStartedAtIso: string;
  private readonly clock: Clock;
  private readonly sections: SectionLog[] = [];
  private latestRun: RunInfo | null = null;
  private count = 0;
  private exported = 0;
  private readonly listeners = new Set<LogListener>();

  constructor(clock: Clock) {
    this.clock = clock;
    this.pageStartedAtIso = new Date(clock.wallTime() - clock.now()).toISOString();
    this.page = this.newSection(null);
  }

  get entryCount(): number {
    return this.count;
  }

  /** The device of the latest run, for the export file name. */
  get latestDeviceName(): string | null {
    return this.latestRun?.deviceName ?? null;
  }

  onEntry(listener: LogListener): void {
    this.listeners.add(listener);
  }

  startRun(deviceName: string, variant: ModelVariant): SectionLog {
    const run: RunInfo = {
      number: this.sections.length,
      deviceName,
      variant,
      startedAtIso: new Date(this.clock.wallTime()).toISOString(),
      startedAt: this.clock.now(),
    };
    this.latestRun = run;
    return this.newSection(run);
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

  private newSection(run: RunInfo | null): SectionLog {
    const section = new SectionLog(run, this.clock, (entry, from) => {
      this.count += 1;
      for (const listener of this.listeners) listener(entry, from);
    });
    this.sections.push(section);
    return section;
  }
}

function copy(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes);
}
