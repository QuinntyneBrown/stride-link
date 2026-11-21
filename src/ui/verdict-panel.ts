// Renders the verdict word, meaning, reason and next step (L2-036). The word is
// always shown; colour only supplements it (L2-062).
import type { VerdictRecord } from "../session/verdict-types.ts";
import { verdictWord } from "../session/verdict-types.ts";
import { setText } from "./dom.ts";
import { verdictCopy } from "./messages/verdict-messages.ts";

export interface VerdictElements {
  readonly card: HTMLElement;
  readonly word: HTMLElement;
  readonly meaning: HTMLElement;
  readonly reasonTerm: HTMLElement;
  readonly reason: HTMLElement;
  readonly nextStep: HTMLElement;
}

export class VerdictPanel {
  private readonly el: VerdictElements;
  private shown: VerdictRecord | null = null;

  constructor(elements: VerdictElements) {
    this.el = elements;
  }

  render(record: VerdictRecord | null): void {
    if (record === this.shown) return;
    this.shown = record;
    const { card, word, meaning, reasonTerm, reason, nextStep } = this.el;
    card.hidden = record === null;
    if (record === null) return;
    card.className = `verdict verdict--${record.verdict}`;
    setText(word, verdictWord[record.verdict]);
    setText(meaning, verdictCopy[record.verdict].meaning);
    reasonTerm.hidden = reason.hidden = record.reason === undefined;
    setText(reason, record.reason ?? "");
    setText(nextStep, verdictCopy[record.verdict].nextStep);
  }
}
