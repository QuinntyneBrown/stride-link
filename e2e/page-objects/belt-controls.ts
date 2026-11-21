// The opt-in gate and the belt controls: Start, speed and incline (L2-042..047).
import type { Locator, Page } from "@playwright/test";

export class BeltControls {
  private readonly page: Page;
  readonly panel: Locator;
  readonly gate: Locator;
  readonly startButton: Locator;
  readonly speedInput: Locator;
  readonly setSpeedButton: Locator;
  readonly speedError: Locator;
  readonly inclineInput: Locator;
  readonly setInclineButton: Locator;
  readonly inclineError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.getByRole("region", { name: "Belt controls" });
    this.gate = page.getByRole("checkbox", { name: "I am standing clear of the belt" });
    this.startButton = page.getByRole("button", { name: "Start", exact: true });
    this.speedInput = page.getByRole("spinbutton", { name: "Target speed (km/h)" });
    this.setSpeedButton = page.getByRole("button", { name: "Set speed" });
    this.speedError = page.locator("#speed-error");
    this.inclineInput = page.getByRole("spinbutton", { name: "Target incline" });
    this.setInclineButton = page.getByRole("button", { name: "Set incline" });
    this.inclineError = page.locator("#incline-error");
  }

  async standClear(): Promise<void> {
    await this.gate.check();
  }

  async start(): Promise<void> {
    await this.startButton.click();
  }

  /** Types as a tester would, so a number input keeps what it would keep. */
  async applySpeed(text: string): Promise<void> {
    await this.speedInput.clear();
    if (text !== "") await this.speedInput.pressSequentially(text);
    await this.setSpeedButton.click();
  }

  async applyIncline(text: string): Promise<void> {
    await this.inclineInput.clear();
    if (text !== "") await this.inclineInput.pressSequentially(text);
    await this.setInclineButton.click();
  }

  /** Whether any of Start, speed or incline is exposed to assistive technology. */
  async controlsInAccessibilityTree(): Promise<boolean> {
    const snapshot = await this.page.locator("body").ariaSnapshot();
    return /button "Start"|spinbutton "Target (speed|incline)|button "Set (speed|incline)"/.test(snapshot);
  }
}
