// Content Security Policy for the page (L2-050) and for the hosted copy (L2-053).
import { createHash } from "node:crypto";

export function sha256Base64(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("base64");
}

export function policy(scriptHash: string, styleHash: string): string {
  return [
    "default-src 'none'",
    `script-src 'sha256-${scriptHash}'`,
    `style-src 'sha256-${styleHash}'`,
    "img-src data:",
    "font-src data:",
    "connect-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

/** The header form adds frame-ancestors, which browsers ignore in a meta tag. */
export function hostedPolicy(metaPolicy: string): string {
  return `${metaPolicy}; frame-ancestors 'none'`;
}

/** Reads the policy back out of a built page. */
export function readMetaPolicy(html: string): string {
  const match = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
  if (!match?.[1]) throw new Error("No Content-Security-Policy meta tag found.");
  return match[1];
}
