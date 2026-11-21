// The plain-text export: header, every run, each run's verdict (L2-040).
import { variantLabel } from "../protocol/variant.ts";
import { formatEntry } from "./log-format.ts";
import type { LogSnapshot } from "./packet-log.ts";
import { verdictWord } from "./verdict-types.ts";

export interface ExportEnvironment {
  readonly version: string;
  readonly commit: string;
  readonly userAgent: string;
  readonly userAgentData: { readonly brands: string; readonly platform: string } | null;
  readonly pageStartedAtIso: string;
}

export function buildExport(snapshot: LogSnapshot, env: ExportEnvironment): string {
  const lines = [
    "Stride Link packet log",
    `Version: ${env.version} (commit ${env.commit})`,
    `User agent: ${env.userAgent}`,
    env.userAgentData
      ? `User agent data: brands ${env.userAgentData.brands}; platform ${env.userAgentData.platform}`
      : "User agent data: not available",
    `Page opened: ${env.pageStartedAtIso}`,
  ];
  for (const section of snapshot.sections) {
    if (!section.run) {
      if (section.entries.length === 0) continue;
      lines.push("", "Page events");
      for (const entry of section.entries) lines.push(formatEntry(entry));
      continue;
    }
    const { run } = section;
    lines.push("", `Run ${run.number}`, `Device: ${run.deviceName}`, `Model variant: ${variantLabel(run.variant)}`, `Run started: ${run.startedAtIso}`);
    for (const entry of section.entries) lines.push(formatEntry(entry));
    const verdict = section.verdict;
    lines.push(verdict ? `Verdict: ${verdictWord[verdict.verdict]}${verdict.reason ? ` (${verdict.reason})` : ""}` : "Verdict: none");
  }
  return `${lines.join("\n")}\n`;
}

/** stride-link-<device>-<YYYYMMDD-HHMMSS>.txt, in local time (L2-040). */
export function exportFileName(deviceName: string | null, at: Date): string {
  const device = deviceName === null ? "unknown" : deviceName.replace(/[^A-Za-z0-9_-]/g, "_");
  const two = (n: number): string => String(n).padStart(2, "0");
  const stamp = `${at.getFullYear()}${two(at.getMonth() + 1)}${two(at.getDate())}-${two(at.getHours())}${two(at.getMinutes())}${two(at.getSeconds())}`;
  return `stride-link-${device}-${stamp}.txt`;
}
