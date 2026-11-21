// Traces to: L2-057
import { test, expect } from "../fixtures.ts";
import { F } from "../fake-bluetooth/frames.ts";

const MB = 1024 * 1024;

test("L2-057: a 60-minute session of 72,000 notifications stays under 50 MB with at most 500 rows, and exports within 2 s", async ({ app }) => {
  test.setTimeout(600_000);
  await app.open();
  await app.connection.connect();
  await app.advance(3_000);
  await app.fake.notifyEvery("f4", F.D3_3KMH, 50, 72_000);
  for (let minute = 0; minute < 60; minute += 1) await app.advance(60_000);
  await app.advance(1_000);
  const snapshot = await app.fake.snapshot();
  expect(snapshot.notifications.filter((n) => n.hex === F.D3_3KMH)).toHaveLength(72_000);
  expect(snapshot.writes.filter((w) => w.hex === F.D3_3KMH)).toHaveLength(72_000);
  expect(snapshot.writes.filter((w) => w.hex.startsWith("F0 A0 01")).length).toBeGreaterThanOrEqual(1_799);
  expect(await app.log.rows.count()).toBeLessThanOrEqual(500);
  expect(await app.heapUsedBytes()).toBeLessThan(50 * MB);
  const exported = await app.log.exportLogTraced();
  expect(exported.startedAfterMs).toBeLessThan(2_000);
});
