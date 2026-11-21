// Traces to: L2-054
import { test, expect } from "../fixtures.ts";

test("L2-054: with 4x CPU throttling Connect is enabled within 1,000 ms and no task exceeds 200 ms", async ({ app }) => {
  const { connectEnabledAtMs, longTasksMs } = await app.openForStartup();
  expect(connectEnabledAtMs).toBeLessThan(1_000);
  expect(longTasksMs.filter((ms) => ms > 200)).toEqual([]);
});
