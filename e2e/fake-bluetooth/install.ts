// Node side of the fake: bundles fake-bluetooth.ts once and installs it in a page
// with addInitScript, so it exists before any page script runs (L2-070).
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import type { Page } from "@playwright/test";
import { baseConfig, type FakeConfig } from "./fake-config.ts";

let bundle: string | undefined;

function fakeBundle(): string {
  if (bundle === undefined) {
    const result = buildSync({
      entryPoints: [join(dirname(fileURLToPath(import.meta.url)), "fake-bluetooth.ts")],
      bundle: true,
      format: "iife",
      target: ["chrome120"],
      write: false,
    });
    const [file] = result.outputFiles;
    if (!file) throw new Error("Could not bundle the fake navigator.bluetooth.");
    bundle = file.text;
  }
  return bundle;
}

export type FakeOverrides = Partial<FakeConfig>;

export async function installFakeBluetooth(page: Page, overrides: FakeOverrides = {}): Promise<FakeConfig> {
  const config: FakeConfig = { ...baseConfig, ...overrides };
  await page.addInitScript({ content: `${fakeBundle()}\n;globalThis.__installFakeBluetooth(${JSON.stringify(config)});` });
  return config;
}
