// Shows the last decoded speed, incline and heart rate, or a dash (L2-032).
// Deliberately not a live region: telemetry is not announced.
import type { Telemetry } from "../session/page-state.ts";
import { NO_VALUE } from "./messages/verdict-messages.ts";

export interface TelemetryElements {
  readonly speed: HTMLElement;
  readonly incline: HTMLElement;
  readonly heartRate: HTMLElement;
}

export class TelemetryPanel {
  private readonly el: TelemetryElements;
  private shown: Telemetry | null = null;

  constructor(elements: TelemetryElements) {
    this.el = elements;
  }

  render(telemetry: Telemetry): void {
    if (telemetry === this.shown) return;
    this.shown = telemetry;
    show(this.el.speed, telemetry.speedKmh === null ? null : telemetry.speedKmh.toFixed(2), "km/h");
    show(this.el.incline, telemetry.incline === null ? null : String(telemetry.incline), null);
    show(this.el.heartRate, telemetry.heartRateBpm === null ? null : String(telemetry.heartRateBpm), "bpm");
  }
}

function show(target: HTMLElement, value: string | null, unit: string | null): void {
  const doc = target.ownerDocument;
  target.classList.toggle("metric__value--empty", value === null);
  if (value === null) {
    target.replaceChildren(doc.createTextNode(NO_VALUE));
    return;
  }
  if (unit === null) {
    target.replaceChildren(doc.createTextNode(value));
    return;
  }
  const unitEl = doc.createElement("span");
  unitEl.className = "metric__unit";
  unitEl.textContent = unit;
  target.replaceChildren(doc.createTextNode(`${value} `), unitEl);
}
