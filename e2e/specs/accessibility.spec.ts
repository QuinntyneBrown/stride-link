// Traces to: L2-060, L2-061, L2-062, L2-063
import { test, expect } from "../fixtures.ts";
import { F } from "../fake-bluetooth/frames.ts";
import { talks, UNTIL_VERDICT_MS } from "../fake-bluetooth/scenarios.ts";
import { PAGE_STATES } from "../page-objects/stride-link-page.ts";

test.describe("axe audits", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const state of PAGE_STATES) {
      test(`L2-062: ${state} in ${scheme} has no serious or critical axe violations`, async ({ app, page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await app.reach(state);
        expect(await app.probe.seriousViolations()).toEqual([]);
      });
    }
  }
});

test.describe("keyboard", () => {
  for (const state of ["idle", "talks", "gate-open", "belt-active"] as const) {
    test(`L2-060: in ${state}, Tab visits every control in reading order and is never trapped`, async ({ app }) => {
      await app.reach(state);
      const tabbable = await app.probe.tabbableIds();
      const sequence = await app.probe.tabSequence();
      expect(sequence.map((s) => s.id).sort()).toEqual([...tabbable].sort());
      // Reading order in the left column runs top to bottom; the log column follows it.
      const primary = await app.probe.box("primary");
      const left = sequence.filter((s) => primary && s.box.x < primary.x + primary.width && s.id !== "stop-belt");
      for (let i = 1; i < left.length; i += 1) expect(left[i]?.box.y ?? 0).toBeGreaterThanOrEqual((left[i - 1]?.box.y ?? 0) - 1);
      // Never trapped: Tab past the last control leaves the page or returns to the first.
      await app.page.keyboard.press("Tab");
      const after = await app.page.evaluate(() => (document.activeElement === document.body ? "" : (document.activeElement?.id ?? "")));
      expect(["", sequence[0]?.id]).toContain(after);
    });

    test(`L2-060: in ${state}, every focused control shows a ring at least 2 px thick at 3:1`, async ({ app }) => {
      await app.reach(state);
      for (const ring of await app.probe.focusRings()) {
        expect(ring.style, ring.id).not.toBe("none");
        expect(ring.width, ring.id).toBeGreaterThanOrEqual(2);
        expect(ring.contrast, ring.id).toBeGreaterThanOrEqual(3);
      }
    });
  }

  test("L2-060: buttons activate with Enter and Space", async ({ app }) => {
    await app.open(talks);
    await app.connection.connectButton.focus();
    await app.page.keyboard.press("Enter");
    await app.advance(UNTIL_VERDICT_MS);
    await expect(app.verdict.word).toHaveText("Talks");
    await app.belt.gate.focus();
    await app.page.keyboard.press("Space");
    await expect(app.belt.gate).toBeChecked();
    await app.belt.startButton.focus();
    await app.page.keyboard.press("Space");
    await app.advance(100);
    await expect(app.stop.button).toBeVisible();
    await app.belt.speedInput.fill("1.5");
    await app.belt.setSpeedButton.focus();
    await app.page.keyboard.press("Enter");
    await app.advance(100);
    expect(await app.fake.writtenHex()).toContain("F0 B2 02 05 DC 85");
    const download = app.page.waitForEvent("download");
    await app.log.exportButton.focus();
    await app.page.keyboard.press("Space");
    expect((await download).suggestedFilename()).toMatch(/^stride-link-STRIDE-8S-/);
    await app.connection.disconnectButton.focus();
    await app.page.keyboard.press("Enter");
    await app.advance(1_500);
    await expect(app.connection.disconnectButton).toBeHidden();
  });

  test("L2-060: the connection-lost Dismiss works by keyboard", async ({ app }) => {
    await app.reach("connection-lost");
    await app.stop.dismissConnectionLost.focus();
    await app.page.keyboard.press("Space");
    await expect(app.stop.connectionLost).toBeHidden();
  });
});

test.describe("targets and touch", () => {
  for (const state of PAGE_STATES) {
    test(`L2-061: in ${state} every interactive element is at least 44 x 44 px`, async ({ app }) => {
      await app.reach(state);
      for (const target of await app.probe.targets()) {
        expect(target.width, target.id).toBeGreaterThanOrEqual(44);
        expect(target.height, target.id).toBeGreaterThanOrEqual(44);
        if (target.id === "stop-belt") expect(Math.min(target.width, target.height)).toBeGreaterThanOrEqual(64);
      }
    });
  }

  test.describe("on a touch-only phone", () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width: 412, height: 915 } });

    test("L2-061: a whole run and an export work by tapping", async ({ app }) => {
      await app.open(talks);
      await app.connection.connectButton.tap();
      await app.advance(UNTIL_VERDICT_MS);
      await expect(app.verdict.word).toHaveText("Talks");
      await app.belt.gate.tap();
      await expect(app.belt.gate).toBeChecked();
      await app.belt.startButton.tap();
      await app.advance(100);
      await app.belt.speedInput.fill("1");
      await app.belt.setSpeedButton.tap();
      await app.stop.button.tap();
      await app.advance(100);
      const written = await app.fake.writtenHex();
      expect(written).toContain("F0 B0 01 01 A2");
      expect(written).toContain("F0 B2 02 03 E8 8F");
      expect(written).toContain(F.STOP);
      const download = app.page.waitForEvent("download");
      await app.verdict.exportButton.tap();
      expect((await download).suggestedFilename()).toMatch(/\.txt$/);
    });
  });
});

test.describe("colour and contrast", () => {
  for (const state of ["silent", "talks", "unlocked", "locked"] as const) {
    test(`L2-062: ${state} is told in words that stay readable without colour`, async ({ app }) => {
      await app.reach(state);
      for (const part of [app.verdict.word, app.verdict.meaning, app.verdict.nextStep]) {
        await expect(part).not.toHaveText("");
        // Contrast is computed from relative luminance, which greyscale keeps.
        expect(await app.probe.textContrast(part)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    test(`L2-062: in ${scheme}, input and checkbox boundaries reach 3:1`, async ({ app, page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await app.reach("gate-open");
      expect(await app.probe.boundaryContrast("speed")).toBeGreaterThanOrEqual(3);
      expect(await app.probe.boundaryContrast("belt-gate")).toBeGreaterThanOrEqual(3);
    });
  }
});

test.describe("labels, announcements and motion", () => {
  for (const state of ["idle", "gate-open", "belt-active", "connection-lost", "blocked-from-disk"] as const) {
    test(`L2-063: in ${state} every control's accessible name matches its visible label`, async ({ app }) => {
      await app.reach(state);
      for (const { id, name, visible } of await app.probe.labels()) expect(name, id).toBe(visible);
    });
  }

  test("L2-063: connecting, connected, error and disconnected are announced politely; telemetry is not", async ({ app }) => {
    await app.open({ ...talks, connect: "late", lateConnectMs: 500 });
    await expect(app.status.region).toHaveAttribute("aria-live", "polite");
    const seen: string[] = [];
    const record = async (): Promise<void> => { seen.push((await app.status.text.textContent()) ?? ""); };
    await app.connection.connect();
    await app.settle();
    await record();
    await app.advance(600);
    await record();
    await app.advance(UNTIL_VERDICT_MS);
    await app.fake.notify("f4", F.D3_ZERO);
    await app.connection.disconnect();
    await app.settle();
    await record();
    expect(seen).toEqual(["Connecting to the treadmill…", "Connected. Sending the init sequence…", "Disconnected"]);
    await expect(app.telemetry.region.locator("[aria-live]")).toHaveCount(0);
    await expect(app.telemetry.region).not.toHaveAttribute("aria-live", /.+/);
  });

  test("L2-063: an error is announced politely", async ({ app }) => {
    await app.reach("error");
    await expect(app.status.region).toHaveAttribute("aria-live", "polite");
    await expect(app.status.text).toHaveText("This device doesn't expose the Echelon service. Is it a Stride?");
  });

  for (const state of ["connecting", "belt-active", "connection-lost"] as const) {
    test(`L2-063: in ${state} with reduced motion nothing animates or transitions`, async ({ app, page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await app.reach(state);
      expect(await app.probe.movingElements()).toEqual([]);
    });
  }
});
