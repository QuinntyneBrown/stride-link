// The opt-in gate and the belt controls (L2-042, L2-043, L2-046, L2-047). Hidden
// controls carry `hidden`, which removes them from layout, the accessibility tree
// and the Tab order.
import type { InclineInput, SpeedInput } from "../protocol/belt-input.ts";
import type { BeltView } from "../session/belt-controller.ts";
import { setText } from "./dom.ts";
import { GATE_LABEL, inputErrors } from "./messages/belt-messages.ts";

export interface BeltPanelElements {
  readonly panel: HTMLElement;
  readonly gate: HTMLInputElement;
  readonly gateLabel: HTMLElement;
  readonly controls: HTMLElement;
  readonly start: HTMLButtonElement;
  readonly speed: HTMLInputElement;
  readonly speedApply: HTMLButtonElement;
  readonly speedError: HTMLElement;
  readonly incline: HTMLInputElement;
  readonly inclineApply: HTMLButtonElement;
  readonly inclineError: HTMLElement;
}

export interface BeltActions {
  setGate(open: boolean): void;
  start(): void;
  setSpeed(raw: string): SpeedInput | null;
  setIncline(raw: string): InclineInput | null;
}

export class BeltPanel {
  private readonly el: BeltPanelElements;

  constructor(elements: BeltPanelElements, actions: BeltActions) {
    this.el = elements;
    setText(elements.gateLabel, GATE_LABEL);
    elements.gate.addEventListener("change", () => { actions.setGate(elements.gate.checked); });
    elements.start.addEventListener("click", () => { actions.start(); });
    elements.speedApply.addEventListener("click", () => {
      showResult(elements.speed, elements.speedError, actions.setSpeed(elements.speed.value));
    });
    elements.inclineApply.addEventListener("click", () => {
      showResult(elements.incline, elements.inclineError, actions.setIncline(elements.incline.value));
    });
  }

  render(view: BeltView): void {
    const { panel, gate, controls, speed, speedError, incline, inclineError } = this.el;
    panel.hidden = !view.gateOffered;
    gate.checked = view.gateOpen;
    const wasHidden = controls.hidden;
    controls.hidden = !(view.gateOffered && view.gateOpen);
    if (controls.hidden && !wasHidden) {
      showResult(speed, speedError, null);
      showResult(incline, inclineError, null);
    }
  }
}

function showResult(input: HTMLInputElement, error: HTMLElement, result: SpeedInput | InclineInput | null): void {
  const message = result && !result.ok ? inputErrors[result.error] : "";
  setText(error, message);
  error.hidden = message === "";
  if (message === "") input.removeAttribute("aria-invalid");
  else input.setAttribute("aria-invalid", "true");
}
