// Checks the build applies to its own output. Each throws with a plain message.

export const SIZE_LIMIT_BYTES = 204_800;

const FORBIDDEN_APIS = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "sendBeacon",
  "importScripts",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "caches",
  "cookie",
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
  "eval",
];

/** L2-001: the file must stay under 204,800 bytes. */
export function assertUnderSizeLimit(bytes: number, limit: number = SIZE_LIMIT_BYTES): void {
  if (bytes >= limit) {
    throw new Error(`dist/stride-link.html is ${bytes} bytes; it must be under ${limit} bytes (L2-001).`);
  }
}

/** L2-049, L2-050, L2-051, L2-052: banned APIs, inline attributes and unsafe sources. */
export function scanForbidden(script: string, markup: string): void {
  for (const api of FORBIDDEN_APIS) {
    const pattern = new RegExp(`\\b${api}\\b`);
    if (pattern.test(script) || pattern.test(markup)) {
      throw new Error(`forbidden API "${api}" found in the bundle (L2-049, L2-051, L2-052).`);
    }
  }
  if (/<\/script/i.test(script)) throw new Error("the script contains </script.");
  if (/<[^>]+\sstyle\s*=/i.test(markup)) throw new Error("inline style attribute found (L2-050).");
  if (/<[^>]+\son[a-z]+\s*=/i.test(markup)) throw new Error("inline on* handler found (L2-050).");
  if (/'unsafe-(inline|eval)'/.test(markup)) throw new Error("unsafe CSP source found (L2-050).");
}

/** L2-001: no external script, link, image or CSS url(). */
export function assertSelfContained(markup: string, style: string): void {
  if (/<script[^>]*\ssrc\s*=/i.test(markup)) throw new Error("external <script src> found (L2-001).");
  for (const match of markup.matchAll(/<(link|img)\b[^>]*\s(?:href|src)\s*=\s*"([^"]*)"/gi)) {
    const value = match[2] ?? "";
    if (!value.startsWith("data:")) throw new Error(`external <${match[1] ?? ""}> reference "${value}" (L2-001).`);
  }
  for (const match of style.matchAll(/url\(\s*["']?([^"')]*)/gi)) {
    const value = match[1] ?? "";
    if (!value.startsWith("data:")) throw new Error(`CSS url() is not a data: URI: "${value}" (L2-001).`);
  }
}
