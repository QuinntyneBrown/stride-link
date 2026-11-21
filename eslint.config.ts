// ESLint enforces the security, privacy and layering rules of AGENTS.md.
// A violation fails `npm run lint`, and therefore `npm run check` and CI.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const networkAndStorageGlobals = [
  { name: "fetch", message: "Nothing leaves the device (L2-049)." },
  { name: "XMLHttpRequest", message: "Nothing leaves the device (L2-049)." },
  { name: "WebSocket", message: "Nothing leaves the device (L2-049)." },
  { name: "EventSource", message: "Nothing leaves the device (L2-049)." },
  { name: "importScripts", message: "Nothing leaves the device (L2-049)." },
  { name: "localStorage", message: "Nothing persists (L2-052)." },
  { name: "sessionStorage", message: "Nothing persists (L2-052)." },
  { name: "indexedDB", message: "Nothing persists (L2-052)." },
  { name: "caches", message: "Nothing persists (L2-052)." },
  { name: "eval", message: "eval is banned (L2-051)." },
];

const htmlSinkProperties = ["innerHTML", "outerHTML", "insertAdjacentHTML"].map((property) => ({
  property,
  message: "Insert untrusted text as text nodes only (L2-051).",
}));

const bannedProperties = [
  ...htmlSinkProperties,
  { object: "document", property: "write", message: "document.write is banned (L2-051)." },
  { object: "document", property: "writeln", message: "document.writeln is banned (L2-051)." },
  { object: "document", property: "cookie", message: "Nothing persists (L2-052)." },
  { object: "navigator", property: "sendBeacon", message: "Nothing leaves the device (L2-049)." },
  ...["window", "globalThis", "self"].flatMap((object) =>
    networkAndStorageGlobals.map(({ name, message }) => ({ object, property: name, message })),
  ),
];

const bannedSyntax = [
  {
    selector: "MemberExpression[property.name=/^(innerHTML|outerHTML|insertAdjacentHTML)$/]",
    message: "Insert untrusted text as text nodes only (L2-051).",
  },
  {
    selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^(style|on.*)$/i]",
    message: "No inline style or on* attributes under the CSP (L2-050).",
  },
  { selector: "CallExpression[callee.name='Function']", message: "Dynamic code is banned (L2-050)." },
  { selector: "NewExpression[callee.name='Function']", message: "Dynamic code is banned (L2-050)." },
];

const impureGlobals = ["window", "document", "navigator", "setTimeout", "setInterval", "Date", "performance"].map(
  (name) => ({ name, message: "src/protocol/ is pure (L2-069)." }),
);

const layerImport = (group: string[], message: string) => ({
  patterns: [{ group, message }],
});

export default defineConfig(
  { ignores: ["node_modules/", "dist/", "coverage/", "test-results/", "playwright-report/", "docs/", ".agents/", ".claude/"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "no-restricted-globals": ["error", ...networkAndStorageGlobals],
      "no-restricted-properties": ["error", ...bannedProperties],
      "no-restricted-syntax": ["error", ...bannedSyntax],
    },
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["src/protocol/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", ...networkAndStorageGlobals, ...impureGlobals],
      "no-restricted-imports": ["error", layerImport(["**/ble/**", "**/session/**", "**/ui/**"], "protocol depends on nothing.")],
    },
  },
  {
    files: ["src/ble/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", layerImport(["**/session/**", "**/ui/**"], "ble depends only on protocol.")],
    },
  },
  {
    files: ["src/session/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", layerImport(["**/ui/**"], "session must not depend on ui.")],
      "no-restricted-properties": [
        "error",
        ...bannedProperties,
        { object: "navigator", property: "bluetooth", message: "Only src/ble/ touches navigator.bluetooth." },
      ],
    },
  },
  {
    files: ["src/ui/**/*.ts", "src/main.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        ...bannedProperties,
        { object: "navigator", property: "bluetooth", message: "Only src/ble/ touches navigator.bluetooth." },
      ],
    },
  },
  {
    files: ["e2e/**/*.ts", "tests/**/*.ts", "scripts/**/*.ts", "*.config.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Never shipped. The privacy probe calls the banned APIs inside the page to prove
    // the CSP blocks them and that storage stays empty (L2-050, L2-052); the release
    // tool fetches the deployed hosted copy to check its headers (L2-053). The build
    // still scans the shipped bundle for every one of them.
    files: ["e2e/page-objects/privacy-probe.ts", "scripts/verify-hosted.ts"],
    rules: { "no-restricted-properties": "off", "no-restricted-globals": "off" },
  },
);
