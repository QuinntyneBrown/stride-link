// The on-screen log: the latest 500 entries as text nodes, rendered in animation
// frames, following new entries only while the tester is at the bottom (L2-039).
import { formatEntry } from "../session/log-format.ts";
import type { LogEntry, LogSection, PacketLog } from "../session/packet-log.ts";
import { setText } from "./dom.ts";

export const MAX_ROWS = 500;

interface Pending {
  readonly entry: LogEntry;
  readonly section: LogSection;
}

export class LogView {
  private readonly scroller: HTMLElement;
  private readonly list: HTMLOListElement;
  private readonly empty: HTMLElement;
  private readonly count: HTMLElement;
  private readonly log: PacketLog;
  private pending: Pending[] = [];
  private scheduled = false;
  private lastSection: LogSection | null = null;
  private rows = 0;

  constructor(parts: { scroller: HTMLElement; list: HTMLOListElement; empty: HTMLElement; count: HTMLElement }, log: PacketLog) {
    this.scroller = parts.scroller;
    this.list = parts.list;
    this.empty = parts.empty;
    this.count = parts.count;
    this.log = log;
    log.onEntry((entry, section) => {
      this.pending.push({ entry, section });
      if (!this.scheduled) {
        this.scheduled = true;
        requestAnimationFrame(() => { this.flush(); });
      }
    });
  }

  private flush(): void {
    this.scheduled = false;
    const batch = this.pending.slice(-MAX_ROWS);
    this.pending = [];
    const atBottom = this.scroller.scrollHeight - this.scroller.scrollTop - this.scroller.clientHeight < 4;
    const doc = this.list.ownerDocument;
    const fragment = doc.createDocumentFragment();
    for (const { entry, section } of batch) {
      if (section !== this.lastSection) {
        this.lastSection = section;
        const heading = doc.createElement("li");
        heading.className = "log__run";
        heading.textContent = section.run ? `Run ${section.run.number} · ${section.run.deviceName}` : "Page events";
        fragment.append(heading);
      }
      const row = doc.createElement("li");
      row.className = `log__line log__line--${entry.dir.toLowerCase()}`;
      if (entry.dir === "TX" && entry.error) row.classList.add("log__line--error");
      row.textContent = formatEntry(entry);
      fragment.append(row);
      this.rows += 1;
    }
    this.list.append(fragment);
    const heightBefore = this.scroller.scrollHeight;
    this.trim();
    this.empty.hidden = true;
    setText(this.count, `${this.log.entryCount.toLocaleString("en")} ${this.log.entryCount === 1 ? "entry" : "entries"}`);
    if (atBottom) this.scroller.scrollTop = this.scroller.scrollHeight;
    else this.scroller.scrollTop -= heightBefore - this.scroller.scrollHeight;
  }

  /** Drops the oldest rows; a run heading stays above its remaining rows. */
  private trim(): void {
    while (this.rows > MAX_ROWS) {
      const first = this.list.firstElementChild;
      if (!first) return;
      const next = first.nextElementSibling;
      if (first.classList.contains("log__run") && next?.classList.contains("log__line")) {
        next.remove();
      } else {
        first.remove();
        if (!first.classList.contains("log__line")) continue;
      }
      this.rows -= 1;
    }
    // Drop a heading left with no rows under it.
    const first = this.list.firstElementChild;
    if (first?.classList.contains("log__run") && !first.nextElementSibling?.classList.contains("log__line")) first.remove();
  }
}
