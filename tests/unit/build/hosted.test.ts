// Traces to: L2-053, L2-059
import { describe, expect, it } from "vitest";
import { policy } from "../../../scripts/csp.ts";
import { hashFromSha256sum, headersFile, hostedHeaders, hostedProblems, sha256Hex, sha256sumLine, type HostedObservation } from "../../../scripts/hosted.ts";

const metaPolicy = policy("c2NyaXB0", "c3R5bGU=");
const html = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${metaPolicy}"><title>Stride Link</title>`;
const body = new TextEncoder().encode(html);

function good(): HostedObservation {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(hostedHeaders(html))) headers[name.toLowerCase()] = value;
  return { httpStatus: 301, httpLocation: "https://example.org/stride-link.html", headers, body };
}

describe("L2-053 hosted headers", () => {
  it("adds frame-ancestors 'none' to the page policy and sets HSTS, nosniff and no-referrer", () => {
    expect(hostedHeaders(html)).toEqual({
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": `${metaPolicy}; frame-ancestors 'none'`,
    });
  });

  it("writes a _headers file for the page path", () => {
    expect(headersFile(html).split("\n")[0]).toBe("/stride-link.html");
    expect(headersFile(html)).toContain("  X-Content-Type-Options: nosniff\n");
  });

  it("accepts a hosted copy that meets every criterion", () => {
    expect(hostedProblems(good(), sha256Hex(body))).toEqual([]);
  });

  it("reports a missing https redirect", () => {
    expect(hostedProblems({ ...good(), httpStatus: 200, httpLocation: null }, sha256Hex(body))).toEqual([
      "http:// is not redirected to https:// (status 200, Location none).",
    ]);
    expect(hostedProblems({ ...good(), httpLocation: "http://example.org/" }, sha256Hex(body))).toHaveLength(1);
  });

  it("reports weak or missing headers", () => {
    const seen = good();
    const problems = hostedProblems(
      { ...seen, headers: { ...seen.headers, "strict-transport-security": "max-age=600", "x-content-type-options": "", "referrer-policy": "origin", "content-security-policy": metaPolicy } },
      sha256Hex(body),
    );
    expect(problems).toEqual([
      "Strict-Transport-Security max-age is below 31536000.",
      "X-Content-Type-Options is not nosniff.",
      "Referrer-Policy is not no-referrer.",
      "Content-Security-Policy does not equal the page policy plus frame-ancestors 'none'.",
    ]);
    const noHsts = Object.fromEntries(Object.entries(seen.headers).filter(([name]) => name !== "strict-transport-security"));
    expect(hostedProblems({ ...seen, headers: noHsts }, sha256Hex(body))).toEqual(["Strict-Transport-Security max-age is below 31536000."]);
  });

  it("reports a copy whose hash differs from the release", () => {
    expect(hostedProblems(good(), "0".repeat(64))[0]).toMatch(/^SHA-256 [0-9a-f]{64} does not match the release hash 0{64}\.$/);
  });
});

describe("L2-059 release hash", () => {
  it("writes and reads sha256sum format", () => {
    const line = sha256sumLine(body);
    expect(line).toBe(`${sha256Hex(body)}  stride-link.html\n`);
    expect(hashFromSha256sum(line)).toBe(sha256Hex(body));
    expect(hashFromSha256sum(`${sha256Hex(body)} *stride-link.html`)).toBe(sha256Hex(body));
  });

  it("refuses anything else", () => {
    expect(() => hashFromSha256sum("abc  other.html")).toThrow("Not a sha256sum line for stride-link.html.");
  });
});
