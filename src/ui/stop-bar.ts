// Stop belt: fixed in the viewport whenever the belt is active, in the Tab order,
// and sent by Escape from anywhere on the page (L2-044, L2-045).
import type { BeltView } from "../session/belt-controller.ts";
import { setText } from "./dom.ts";
import { STOP_FAILED } from "./messages/belt-messages.ts";

export interface StopBarElements {
  readonly bar: HTMLElement;
  readonly button: HTMLButtonElement;
  readonly failed: HTMLElement;
}

export class StopBar {
  private readonly el: StopBarElements;
  private active = false;

  constructor(elements: StopBarElements, stop: () => void) {
    this.el = elements;
    setText(elements.failed, STOP_FAILED);
    elements.button.addEventListener("click", () => { stop(); });
    // Capture phase on the document, so Escape works from any focus, inputs included.
    elements.bar.ownerDocument.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || !this.active) return;
        event.preventDefault();
        stop();
      },
      { capture: true },
    );
  }

  render(view: BeltView): void {
    this.active = view.active;
    this.el.bar.hidden = !view.active;
    this.el.bar.ownerDocument.body.classList.toggle("has-stop-bar", view.active);
    this.el.failed.hidden = !(view.active && view.stopFailed);
  }
}
