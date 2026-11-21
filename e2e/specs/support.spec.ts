// Traces to: L2-002, L2-003, L2-004, L2-005, L2-068
import { test, expect } from "../fixtures.ts";

test.describe("Bluetooth support check", () => {
  test("L2-002: an enabled Connect and the ownership notice on a supported browser", async ({ app }) => {
    await app.open();
    await expect(app.connection.connectButton).toBeVisible();
    await expect(app.connection.connectButton).toBeEnabled();
    await expect(app.connection.ownershipNotice).toHaveText("Use Stride Link only on a treadmill you own.");
    expect(await app.fake.callNames()).toEqual(["getAvailability"]);
  });

  test("L2-003: a plain message and a disabled Connect without Web Bluetooth", async ({ app }) => {
    await app.open({ availability: "absent" });
    await expect(app.status.text).toHaveText("This browser can't use Bluetooth. Open this file in Chrome or Edge.");
    await expect(app.connection.connectButton).toBeDisabled();
    await app.connection.connectButton.click({ force: true });
    await expect(app.status.text).toHaveText("This browser can't use Bluetooth. Open this file in Chrome or Edge.");
    expect(await app.page.evaluate(() => "bluetooth" in navigator)).toBe(false);
  });

  test("L2-004: adapter off disables Connect until availability returns", async ({ app }) => {
    await app.open({ availability: false });
    await expect(app.status.text).toHaveText("Bluetooth is off or unavailable on this device. Turn it on to continue.");
    await expect(app.connection.connectButton).toBeDisabled();

    await app.fake.setAvailability(true);
    await expect(app.status.text).not.toHaveText("Bluetooth is off or unavailable on this device. Turn it on to continue.");
    await expect(app.connection.connectButton).toBeEnabled();
  });

  test("L2-004: adapter turned off after load disables Connect", async ({ app }) => {
    await app.open();
    await expect(app.connection.connectButton).toBeEnabled();
    await app.fake.setAvailability(false);
    await expect(app.status.text).toHaveText("Bluetooth is off or unavailable on this device. Turn it on to continue.");
    await expect(app.connection.connectButton).toBeDisabled();
  });

  test("L2-068: the footer shows the version and short commit", async ({ app }) => {
    await app.open();
    await expect(app.footer.version).toHaveText("v1.0.0");
    await expect(app.footer.commit).toHaveText(/^[0-9a-f]{7}$|^unknown$/);
  });
});

test.describe("unlisted browser that exposes Web Bluetooth", () => {
  test.use({ userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0" });

  test("L2-005: the page does not block it", async ({ app }) => {
    await app.open();
    await expect(app.connection.connectButton).toBeEnabled();
  });
});
