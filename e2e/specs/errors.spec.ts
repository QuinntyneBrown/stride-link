// Traces to: L2-058
import { test, expect } from "../fixtures.ts";
import type { FakeOverrides } from "../fake-bluetooth/install.ts";
import { chooserCancel, connectTimeout, midRunDisconnect, missingService, subscribeFailure, UNTIL_VERDICT_MS, writeFailure } from "../fake-bluetooth/scenarios.ts";

// The fixture fails any test with a pageerror, unhandledrejection or console
// error, so each case below also proves criterion 1.
const failures: { name: string; fake: FakeOverrides; afterConnectMs: number; status: string; logged: RegExp }[] = [
  { name: "chooser cancel", fake: chooserCancel, afterConnectMs: 50, status: "No treadmill selected.", logged: /EV Chooser error NotFoundError: User cancelled the requestDevice\(\) chooser\.$/ },
  { name: "connect timeout", fake: connectTimeout, afterConnectMs: 10_100, status: "Couldn't connect within 10 seconds. Move closer to the treadmill and try again.", logged: /EV Error TimeoutError: Connection and service discovery took longer than 10000 ms\.$/ },
  { name: "missing service", fake: missingService, afterConnectMs: 1_000, status: "This device doesn't expose the Echelon service. Is it a Stride?", logged: /EV Error NotFoundError: .+$/ },
  { name: "subscribe failure", fake: subscribeFailure, afterConnectMs: 1_000, status: "Couldn't turn on treadmill notifications.", logged: /EV Error \w+Error: .+$/ },
  { name: "write failure", fake: writeFailure, afterConnectMs: 3_000, status: "Init sent. Waiting for the treadmill to answer…", logged: /TX f2 F0 A1 00 91 init write failed NetworkError: GATT operation failed for unknown reason\.$/ },
  { name: "mid-run disconnect", fake: midRunDisconnect, afterConnectMs: UNTIL_VERDICT_MS + 5_000, status: "Disconnected", logged: /EV Disconnected$/ },
];

for (const { name, fake, afterConnectMs, status, logged } of failures) {
  test(`L2-058: a ${name} is caught, shown in plain words and logged with its name and message`, async ({ app }) => {
    await app.open(fake);
    await app.connection.connect();
    await app.advance(afterConnectMs);
    await expect(app.status.text).toHaveText(status);
    await expect(app.status.text).not.toHaveText(/\bat \S+:\d+|Error:|\n/);
    expect((await app.log.rowTexts()).some((row) => logged.test(row))).toBe(true);
  });
}
