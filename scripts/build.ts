// npm run build: type-check, bundle, inline, hash, scan, size-check and write
// dist/stride-link.html (L2-001, L2-049..052, L2-068). The output depends only on
// the source, package.json, the commit and STRIDE_LINK_HOSTED_URL, so two builds
// of one commit are byte-identical.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { assertSelfContained, assertUnderSizeLimit, scanForbidden } from "./build-checks.ts";
import { policy, sha256Base64 } from "./csp.ts";

export const DEFAULT_HOSTED_URL = "https://quinntynebrown.github.io/stride-link/stride-link.html";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fromRoot = (...parts: string[]): string => join(root, ...parts);

function fail(message: string): never {
  throw new Error(message);
}

function typecheck(): void {
  const tsc = spawnSync(process.execPath, [fromRoot("node_modules", "typescript", "bin", "tsc"), "--noEmit"], {
    cwd: root,
    stdio: "inherit",
  });
  if (tsc.status !== 0) fail("tsc --noEmit reported errors.");
}

function readCommit(): string {
  const fromEnv = process.env["STRIDE_LINK_COMMIT"];
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function readHostedUrl(): string {
  // An unset or empty variable (an unset CI variable is empty) uses the default.
  const url = process.env["STRIDE_LINK_HOSTED_URL"] || DEFAULT_HOSTED_URL;
  if (!/^https:\/\/[^\s"'<>]+$/.test(url)) fail(`STRIDE_LINK_HOSTED_URL must be an https:// URL, got "${url}".`);
  return url;
}

function readVersion(): string {
  const pkg = JSON.parse(readFileSync(fromRoot("package.json"), "utf8")) as { version: string };
  return pkg.version;
}

async function bundleScript(buildInfo: Record<string, string>): Promise<string> {
  const result = await esbuild.build({
    entryPoints: [fromRoot("src", "main.ts")],
    bundle: true,
    format: "iife",
    target: ["chrome120"],
    minify: true,
    write: false,
    legalComments: "none",
    charset: "utf8",
    define: Object.fromEntries(Object.entries(buildInfo).map(([key, value]) => [key, JSON.stringify(value)])),
  });
  return textOf(result);
}

async function bundleStyle(): Promise<string> {
  const result = await esbuild.build({
    entryPoints: [fromRoot("src", "styles", "main.css")],
    bundle: true,
    minify: true,
    write: false,
    legalComments: "none",
    charset: "utf8",
    target: ["chrome120"],
    loader: { ".woff2": "dataurl", ".svg": "dataurl" },
  });
  return textOf(result);
}

function textOf(result: esbuild.BuildResult & { outputFiles: esbuild.OutputFile[] }): string {
  const [file] = result.outputFiles;
  if (!file) fail("esbuild produced no output.");
  return file.text.trimEnd();
}

export async function build(): Promise<{ path: string; bytes: number }> {
  typecheck();
  const buildInfo = {
    __STRIDE_LINK_VERSION__: readVersion(),
    __STRIDE_LINK_COMMIT__: readCommit(),
    __STRIDE_LINK_HOSTED_URL__: readHostedUrl(),
  };
  const [script, style] = await Promise.all([bundleScript(buildInfo), bundleStyle()]);
  const icon = `data:image/svg+xml;base64,${readFileSync(fromRoot("src", "styles", "favicon.svg")).toString("base64")}`;
  const template = readFileSync(fromRoot("src", "index.html"), "utf8");
  scanForbidden(script, template);

  const csp = policy(sha256Base64(script), sha256Base64(style));
  const html = template
    .replace("{{CSP}}", () => csp)
    .replace("{{ICON}}", () => icon)
    .replace("{{STYLE}}", () => style)
    .replace("{{SCRIPT}}", () => script);
  if (html.includes("{{")) fail("unfilled template placeholder.");
  assertSelfContained(html.replace(style, "").replace(script, ""), style);

  const bytes = Buffer.byteLength(html, "utf8");
  assertUnderSizeLimit(bytes);

  const outDir = fromRoot("dist");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir);
  const path = join(outDir, "stride-link.html");
  writeFileSync(path, html, "utf8");
  console.log(`dist/stride-link.html ${bytes} bytes (${buildInfo.__STRIDE_LINK_VERSION__} ${buildInfo.__STRIDE_LINK_COMMIT__})`);
  return { path, bytes };
}

try {
  await build();
} catch (error) {
  console.error(`build failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
