// Traces to: L2-004, L2-006, L2-007, L2-008, L2-009, L2-051
import { test, expect } from "../fixtures.ts";

const SERVICE = "0bf669f1-45f2-11e7-9598-0800200c9a66";

test.describe("selecting a treadmill", () => {
  test("L2-006: the chooser opens only from Connect, filtered to Strides", async ({ app }) => {
    await app.open();
    await app.settle();
    expect(await app.fake.callNames()).toEqual(["getAvailability"]);

    await app.connection.connect();
    const calls = (await app.fake.snapshot()).calls.filter((c) => c.name === "requestDevice");
    expect(calls).toHaveLength(1);
    const options = JSON.parse(calls[0]?.detail ?? "{}") as Record<string, unknown>;
    expect(options["filters"]).toEqual([{ namePrefix: "STRIDE" }, { namePrefix: "Stride" }, { namePrefix: "stride" }, { services: [SERVICE] }]);
    expect(options["exclusionFilters"]).toEqual([{ namePrefix: "ECH" }, { namePrefix: "Ech" }, { namePrefix: "ech" }]);
    expect(options["optionalServices"]).toEqual([SERVICE]);
    expect(await app.fake.callNames()).not.toContain("getDevices");
  });

  test("L2-006: Connect is disabled while a run is in progress", async ({ app }) => {
    await app.open({ connect: "hang" });
    await app.connection.connect();
    await expect(app.connection.connectButton).toBeDisabled();
  });

  for (const name of ["ECH-SPORT-1234", "echBike"]) {
    test(`L2-007: ${name} is rejected as an Echelon bike`, async ({ app }) => {
      await app.open({ deviceName: name });
      await app.connection.connect();
      await expect(app.status.text).toHaveText("This looks like an Echelon bike. Stride Link only tests Stride treadmills.");
      await expect(app.connection.connectButton).toBeEnabled();
      await app.settle();
      expect(await app.fake.callNames()).not.toContain("gatt.connect");
      expect((await app.log.rowTexts()).some((row) => row.includes(`Rejected Echelon bike: ${name}`))).toBe(true);
    });
  }

  const variants = [
    { name: "STRIDE4-ABC", label: "Stride 4", logged: "Model variant: Stride 4" },
    { name: "stride4x", label: "Stride 4", logged: "Model variant: Stride 4" },
    { name: "STRIDE-8S", label: "Standard", logged: "Model variant: standard" },
  ];
  for (const { name, label, logged } of variants) {
    test(`L2-008: ${name} uses the ${label} variant`, async ({ app }) => {
      await app.open({ deviceName: name, connect: "hang" });
      await app.connection.connect();
      await expect(app.facts.deviceName).toHaveText(name);
      await expect(app.facts.variant).toHaveText(label);
      await app.settle();
      expect((await app.log.rowTexts()).some((row) => row.endsWith(`EV ${logged}`))).toBe(true);
    });
  }

  test("L2-008: an unnamed device is standard and shown as (unnamed device)", async ({ app }) => {
    await app.open({ deviceName: null, connect: "hang" });
    await app.connection.connect();
    await expect(app.facts.deviceName).toHaveText("(unnamed device)");
    await expect(app.facts.variant).toHaveText("Standard");
  });

  test("L2-009: cancelling the chooser returns to idle with no run", async ({ app }) => {
    await app.open({ chooser: "NotFoundError" });
    await app.connection.connect();
    await expect(app.status.text).toHaveText("No treadmill selected.");
    await expect(app.connection.connectButton).toBeEnabled();
    await expect(app.facts.deviceName).toBeHidden();
    await app.settle();
    await expect(app.log.runHeadings).toHaveText(["Page events"]);
    const exported = await app.log.exportLog();
    expect(exported.text).not.toContain("Run 1");
    expect(exported.text).not.toContain("Verdict:");
  });

  test("L2-004: a SecurityError points to the hosted copy and is exported", async ({ app }) => {
    await app.open({ chooser: "SecurityError" });
    await app.connection.connect();
    await expect(app.status.text).toHaveText("This browser blocks Bluetooth on files opened from disk. Open the hosted copy instead.");
    await expect(app.connection.hostedLink).toBeVisible();
    await expect(app.connection.hostedLink).toHaveAttribute("href", /^https:\/\//);
    const exported = await app.log.exportLog();
    expect(exported.text).toContain("SecurityError");
    expect(exported.text).toContain("Origin is not allowed to access the service.");
  });

  test("L2-051: a hostile device name is shown as text", async ({ app, page }) => {
    const hostile = "<img src=x onerror=alert(1)>";
    let dialogs = 0;
    page.on("dialog", (dialog) => { dialogs += 1; void dialog.dismiss(); });
    await app.open({ deviceName: hostile, connect: "hang" });
    await app.connection.connect();
    await expect(app.facts.deviceName).toHaveText(hostile);
    await app.settle();
    expect(await page.locator("img").count()).toBe(0);
    expect(dialogs).toBe(0);
  });
});
