// The hosted copy's response headers and their verification (L2-053). The static
// host is not chosen yet; these give it a header file and give the release a check.
import { createHash } from "node:crypto";
import { hostedPolicy, readMetaPolicy } from "./csp.ts";

export const HSTS_MIN_MAX_AGE = 31_536_000;

export function hostedHeaders(html: string): Record<string, string> {
  return {
    "Strict-Transport-Security": `max-age=${HSTS_MIN_MAX_AGE}; includeSubDomains`,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": hostedPolicy(readMetaPolicy(html)),
  };
}

/** A `_headers` file, the format Netlify and Cloudflare Pages read. */
export function headersFile(html: string, path = "/stride-link.html"): string {
  const lines = Object.entries(hostedHeaders(html)).map(([name, value]) => `  ${name}: ${value}`);
  return `${path}\n${lines.join("\n")}\n`;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** `sha256sum` format: hash, two spaces, file name. */
export function sha256sumLine(bytes: Uint8Array, fileName = "stride-link.html"): string {
  return `${sha256Hex(bytes)}  ${fileName}\n`;
}

export function hashFromSha256sum(line: string): string {
  const match = /^([0-9a-f]{64}) [ *]stride-link\.html\s*$/.exec(line.trim());
  if (!match?.[1]) throw new Error("Not a sha256sum line for stride-link.html.");
  return match[1];
}

export interface HostedObservation {
  /** Status and Location of a plain http:// request, not followed. */
  readonly httpStatus: number;
  readonly httpLocation: string | null;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array;
}

/** Every way the hosted copy falls short of L2-053; empty when it passes. */
export function hostedProblems(seen: HostedObservation, expectedSha256: string): string[] {
  const problems: string[] = [];
  const header = (name: string): string | undefined => seen.headers[name.toLowerCase()];
  if (![301, 302, 307, 308].includes(seen.httpStatus) || !seen.httpLocation?.startsWith("https://")) {
    problems.push(`http:// is not redirected to https:// (status ${seen.httpStatus}, Location ${seen.httpLocation ?? "none"}).`);
  }
  const maxAge = /max-age=(\d+)/.exec(header("Strict-Transport-Security") ?? "")?.[1];
  if (maxAge === undefined || Number(maxAge) < HSTS_MIN_MAX_AGE) problems.push(`Strict-Transport-Security max-age is below ${HSTS_MIN_MAX_AGE}.`);
  if (header("X-Content-Type-Options") !== "nosniff") problems.push("X-Content-Type-Options is not nosniff.");
  if (header("Referrer-Policy") !== "no-referrer") problems.push("Referrer-Policy is not no-referrer.");
  const html = new TextDecoder().decode(seen.body);
  const expectedPolicy = hostedHeaders(html)["Content-Security-Policy"];
  if (header("Content-Security-Policy") !== expectedPolicy) problems.push("Content-Security-Policy does not equal the page policy plus frame-ancestors 'none'.");
  const actual = sha256Hex(seen.body);
  if (actual !== expectedSha256) problems.push(`SHA-256 ${actual} does not match the release hash ${expectedSha256}.`);
  return problems;
}
