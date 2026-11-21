// Traces to: L2-010, L2-011, L2-012, L2-058
import { test, expect } from "../fixtures.ts";

const SERVICE_NOT_FOUND = "This device doesn't expose the Echelon service. Is it a Stride?";
const TIMEOUT = "Couldn't connect within 10 seconds. Move closer to the treadmill and try again.";
const SUBSCRIBE_FAILED = "Couldn't turn on treadmill notifications.";

test.describe("GATT connection and discovery", () => {
  test("L2-010: connecting logs the connection, the service and each characteristic", async ({ app }) => {
    await app.open({ f2Write: true });
    await app.connection.connect();
    await app.settle();
    await expect(app.connection.disconnectButton).toBeVisible();
    await app.settle();
    const rows = await app.log.rowTexts();
    for (const line of [
      "EV Connected",
      "EV Service found",
      "EV Characteristic f2 0bf669f2-45f2-11e7-9598-0800200c9a66 properties: write, writeWithoutResponse",
      "EV Characteristic f3 0bf669f3-45f2-11e7-9598-0800200c9a66 properties: notify",
      "EV Characteristic f4 0bf669f4-45f2-11e7-9598-0800200c9a66 properties: notify",
    ]) {
      expect(rows.some((row) => row.endsWith(line)), line).toBe(true);
    }
  });

  test("L2-010: a device without the Echelon service is disconnected", async ({ app }) => {
    await app.open({ service: false });
    await app.connection.connect();
    await app.settle();
    await expect(app.status.text).toHaveText(SERVICE_NOT_FOUND);
    await expect(app.connection.connectButton).toBeEnabled();
    await app.settle();
    expect(await app.fake.callNames()).toContain("gatt.disconnect");
    expect(await app.fake.writtenHex()).toEqual([]);
    expect((await app.log.rowTexts()).some((row) => row.includes("EV Error NotFoundError: No Services matching UUID"))).toBe(true);
  });

  test("L2-010: connection and discovery are abandoned after 10 seconds", async ({ app }) => {
    await app.open({ connect: "hang" });
    await app.connection.connect();
    await app.advance(9_990);
    await expect(app.status.text).toHaveText("Connecting to the treadmill…");
    await app.advance(10);
    await expect(app.status.text).toHaveText(TIMEOUT);
    await expect(app.connection.connectButton).toBeEnabled();
    expect(await app.fake.callNames()).toContain("gatt.disconnect");
    expect(await app.fake.writtenHex()).toEqual([]);
    await app.settle();
    expect((await app.log.rowTexts()).some((row) => row.includes("EV Error TimeoutError:"))).toBe(true);
  });

  test("L2-010: a connection that completes after the timeout is disconnected and ignored", async ({ app }) => {
    await app.open({ connect: "late", lateConnectMs: 12_000 });
    await app.connection.connect();
    await app.advance(10_000);
    await expect(app.status.text).toHaveText(TIMEOUT);
    await app.advance(5_000);
    await expect(app.status.text).toHaveText(TIMEOUT);
    await expect(app.connection.disconnectButton).toBeHidden();
    expect(await app.fake.writtenHex()).toEqual([]);
    expect((await app.fake.callNames()).filter((name) => name === "startNotifications")).toEqual([]);
  });

  test("L2-011: both notify characteristics are subscribed and logged", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.settle();
    await expect(app.connection.disconnectButton).toBeVisible();
    const subscriptions = (await app.fake.snapshot()).calls.filter((c) => c.name === "startNotifications").map((c) => c.detail);
    expect(subscriptions).toEqual(["f3", "f4"]);
    await app.settle();
    const rows = await app.log.rowTexts();
    expect(rows.some((row) => row.endsWith("EV isNotifying f3: true"))).toBe(true);
    expect(rows.some((row) => row.endsWith("EV isNotifying f4: true"))).toBe(true);
  });

  test("L2-011: a subscription failure disconnects without writing", async ({ app }) => {
    await app.open({ subscribeFailure: "f4" });
    await app.connection.connect();
    await app.settle();
    await expect(app.status.text).toHaveText(SUBSCRIBE_FAILED);
    await expect(app.connection.connectButton).toBeEnabled();
    expect(await app.fake.writtenHex()).toEqual([]);
    expect(await app.fake.callNames()).toContain("gatt.disconnect");
    await app.settle();
    expect((await app.log.rowTexts()).some((row) => row.includes("EV Error NotSupportedError: GATT operation failed"))).toBe(true);
  });
});

test.describe("ending a run", () => {
  test("L2-012: Disconnect ends the run and keeps its log", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.settle();
    await expect(app.connection.disconnectButton).toBeEnabled();
    await app.connection.disconnect();
    await expect(app.status.text).toHaveText("Disconnected");
    await expect(app.connection.connectButton).toBeEnabled();
    expect(await app.fake.callNames()).toContain("gatt.disconnect");
    await app.settle();
    const exported = await app.log.exportLog();
    expect(exported.text).toContain("Run 1");
    expect(exported.text).toMatch(/EV Disconnected\n/);
  });

  test("L2-012: an unexpected drop tears the run down", async ({ app }) => {
    await app.open();
    await app.connection.connect();
    await app.settle();
    await expect(app.connection.disconnectButton).toBeVisible();
    await app.fake.dropConnection();
    await expect(app.status.text).toHaveText("Disconnected");
    await expect(app.connection.disconnectButton).toBeHidden();
    await expect(app.connection.connectButton).toBeEnabled();
    await app.settle();
    const rows = await app.log.rowTexts();
    expect(rows.filter((row) => /^\s+\d+\.\d EV Disconnected$/.test(row))).toHaveLength(1);
    expect(rows.some((row) => row.endsWith("EV isNotifying f4: true"))).toBe(true);
  });
});
