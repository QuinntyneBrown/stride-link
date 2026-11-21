// Speed, incline and heart rate readouts (L2-028..032).
import type { Locator, Page } from "@playwright/test";

export class TelemetryPanel {
  readonly region: Locator;
  readonly speed: Locator;
  readonly incline: Locator;
  readonly heartRate: Locator;

  constructor(page: Page) {
    this.region = page.getByRole("region", { name: "Telemetry" });
    this.speed = page.locator("#telemetry-speed");
    this.incline = page.locator("#telemetry-incline");
    this.heartRate = page.locator("#telemetry-heart-rate");
  }
}
