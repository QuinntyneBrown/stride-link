# Stride Link

## Purpose

Stride Link is one self-contained web page, `stride-link.html`, that connects to an
Echelon Stride treadmill over Web Bluetooth, runs the qdomyos-zwift init and unlock
handshake, and reports in plain words whether the treadmill answers. Every run ends
in exactly one verdict - **Silent**, **Talks**, **Unlocked** or **Locked** - with a
packet log the tester can export.

The source of truth, in order: `docs/specs/L2.md` (detailed requirements with
acceptance criteria), `docs/specs/L1.md`, `docs/detailed-designs/`, and
`docs/PRD-Stride-Link.pdf`. When code and a spec disagree, the spec wins; fix the
code or raise the conflict, never quietly change the spec to match the code.

## Safety and Hardware - CRITICAL

A treadmill belt can move from a command. These rules are absolute.

- Agents must not run hardware tests, connect to real Bluetooth devices, or press
  belt controls on real equipment. Hardware testing is manual and human-only,
  following `docs/manual-hardware-test.md`.
- No CI job and no Playwright project may grant Bluetooth permission or reach the
  real `navigator.bluetooth`. Every test uses the fake.
- Never weaken a belt interlock: the `I am standing clear of the belt` gate, the
  3 km/h speed cap, Stop jumping the write queue, Stop always on screen, and Escape
  sending Stop. A change that touches any of these needs a test proving it still holds.

## Speed Is Not the Goal

Quality and completeness beat finishing fast. Finish the whole task - edge cases,
error paths, no stubs or `TODO`s. If it is bigger than it looked, complete it and
say what it cost rather than quietly narrowing scope.

## Technology

- Strict TypeScript (`"strict": true`). No plain JavaScript source files.
- Node.js 24 LTS and npm for tooling. No runtime dependencies are shipped.
- esbuild bundles the source; `scripts/build.ts` inlines every script, style, font
  and image into `dist/stride-link.html`, computes the CSP hashes, stamps version
  and commit, and fails the build at or above 204,800 bytes.
- Vitest for unit tests; Playwright on Chromium for acceptance tests; axe-core for
  accessibility checks inside tests only.
- No UI framework. Plain DOM APIs, written for the one page.

## Architecture and Design

- Implement requirements radically simply: the least code that satisfies the
  acceptance criteria, and nothing more. Simple in design, never reduced in scope.
- Apply SOLID principles. One responsibility per module, named for what it holds.
- Four layers, dependencies pointing inward toward `protocol`:
  - `src/protocol/` - **pure**. Frame encoding, parsing, checksum, hex formatting,
    unlock arithmetic, telemetry decoding, chooser filters, variant detection. It
    must not reference `window`, `document`, `navigator`, `setTimeout`,
    `setInterval`, `Date` or `performance`.
  - `src/ble/` - the only code that touches `navigator.bluetooth`:
    `BluetoothGateway`, `TreadmillLink`, and the serialised `WriteQueue`.
  - `src/session/` - `RunController` state machine, init pacing, unlock flow,
    keepalive, echo, verdict rules, `PacketLog`, belt commands.
  - `src/ui/` - `AppShell` and the panels. Renders state; holds no protocol logic.
- Every write to `f2` goes through `WriteQueue`: one FIFO, at most one write in
  flight. Stop is the only frame allowed to jump the queue.
- Bytes from the treadmill are untrusted. The parser never throws.
- User-facing strings live in one messages module per area and match the L2 wording
  character for character.

## Privacy and Security

- Nothing leaves the device. No `fetch`, `XMLHttpRequest`, `WebSocket`,
  `EventSource`, `navigator.sendBeacon` or `importScripts`.
- Nothing persists. No `localStorage`, `sessionStorage`, `indexedDB`, `caches` or
  `document.cookie`.
- Device names, error messages and log text are inserted as text nodes only. Never
  use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` or `eval`.
- The CSP is `default-src 'none'` with hashed inline script and style. Never add
  `'unsafe-inline'`, `'unsafe-eval'`, an inline `style` attribute or an `on*` handler.
- These bans are enforced by ESLint and by the build script, not by tests.

## Accessibility and Layout

- WCAG 2.2 AA. Every control reachable by keyboard and touch, at least 44 x 44 CSS
  px (Stop at least 64 x 64), with a visible focus indicator.
- Never convey a verdict or state by colour alone; always show the word.
- Status and verdict changes go through `aria-live="polite"`; telemetry does not.
- Respect `prefers-reduced-motion`. Never disable zoom.
- Breakpoints: one column below 992 px, two columns (log on the right) from 992 px,
  content capped at 1140 px from 1200 px.

## Testing Approach

Use acceptance test-driven development (ATDD): begin with a failing acceptance
test, link it to the Given-When-Then criteria in `docs/specs/L2.md`, implement until
it passes, and keep criteria, tests and implementation aligned.

- Unit (Vitest): the protocol module, with at least one test per frame in the PRD
  frame table and per unlock case, and 100 % line and branch coverage.
- Acceptance (Playwright, Chromium): the page against the scriptable fake
  `navigator.bluetooth` in `e2e/fake-bluetooth/`, installed with `addInitScript`
  before any page script runs.
- Timing is asserted with Playwright's clock API. Never use real sleeps.
- Page Object Model: one page object per screen region, owning the selectors and
  interactions. Tests state intent; page objects know the DOM. Never put a selector
  in a test.
- Every acceptance spec file starts with a header comment `Traces to: L2-xxx`.

### Never write architecture tests

Never add a test that asserts the shape of the codebase rather than its behavior:
no structure, layout, or naming tests; no banned-API scans; no traceability tests
that parse the specifications. Those constraints belong to the compiler, the
linter, the build script, and review. A test suite exists to prove behavior.

## Commands

```bash
npm ci                 # install exactly what package-lock.json pins
npm run build          # produce dist/stride-link.html
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint, including the banned-API rules
npm test               # Vitest unit suite with coverage
npm run test:e2e       # Playwright acceptance suite against the fake
npm run check          # all of the above; must pass before a pull request
```

## Folder Structure

```text
beltcheck/
|-- src/
|   |-- protocol/
|   |-- ble/
|   |-- session/
|   |-- ui/
|   |-- styles/
|   |-- index.html
|   `-- main.ts
|-- tests/
|   `-- unit/
|-- e2e/
|   |-- fake-bluetooth/
|   |-- page-objects/
|   `-- specs/
|-- scripts/
`-- docs/
    |-- specs/
    `-- detailed-designs/
```
