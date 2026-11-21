# Incremental implementation plan

Source of truth: `specs/L2.md`, then `specs/L1.md`, then the sixteen features
in `detailed-designs/README.md`. Scope is all 71 L2 requirements, including
failure paths, safety, accessibility, performance, build and release.

## Starting evidence

On 2026-11-20 the repository contains requirements, detailed designs and mock
assets, but no application, package manifest, tests, mock pages or design system.
Node 24.22.0 and npm 11.19.1 are available. Origin is
`https://github.com/QuinntyneBrown/stride-link.git`.
Existing uncommitted edits to unlock/parser designs, diagrams, review log and
mock CSS predate implementation; preserve them and stage only task-owned changes.
AGENTS.md takes precedence over older design paths: use `scripts/build.ts` and
`e2e/`, not `build.mjs` and `tests/acceptance/`.

## Delivery rules

Save and commit this plan before implementation. For each numbered slice, begin
with failing behavioral acceptance criteria, implement the smallest complete
path, run applicable typecheck/lint/unit/build/acceptance checks, record results
below, commit and push. No real Bluetooth or hardware tests. Install the fake
before every browser page script; use Playwright's clock for timing. Protocol
coverage must reach 100% lines and branches. Keep unimplemented controls disabled
until their complete path lands. No architecture tests or specification scans.

## Slices

| # | Deliverable and verification | Requirements | Status |
|---|---|---|---|
| 0 | Complete static mock states using existing assets; coverage matrix and visual review; extract verified design system before product UI | All visible states, 060–067 | Blocked: design system done; owner must choose and commit one mock set |
| 1 | Strict TS tooling, deterministic single-file build, CSP/size enforcement, fake-only acceptance harness and initial support screen | 001–005, 049–052, 068, 070 | Done |
| 2 | Chooser, variant/bike handling, cancel/security errors and basic exportable diagnostics | 004, 006–009, 037–041 | Done |
| 3 | GATT discovery/subscriptions, timeout, disconnect and serialized writes with failure recovery | 010–012, 056, 058 | Done |
| 4 | Pure encoding/parsing and standard/Stride 4 paced init through the real fake transport | 013–019, 069 | Done |
| 5 | Challenge arithmetic, unlock response/acknowledgement, timeout and retry handling | 020–025, 069 | Done |
| 6 | Keepalive and echo scheduling, cancellation and concurrent queue behavior | 026–027, 055–056 | Done |
| 7 | Telemetry rendering, all four verdicts and exact explanatory copy | 028–036 | Done |
| 8 | Bounded packet log, filters, follow/pause, clear, downloads and metadata | 037–041, 057 | Done |
| 9 | Unlock-only belt gate, standing-clear interlock, start sequence, priority Stop/Escape and disconnect safety | 042–045, 048 | Done |
| 10 | Validated speed/incline controls with hard 3 km/h cap and safe input errors | 046–047 | Done |
| 11 | Complete responsive/accessibility states, keyboard/touch/zoom checks and axe audits | 060–067 | Done |
| 12 | Offline/privacy/CSP runtime checks, startup/load/one-hour performance verification | 001, 049–055, 057–058 | Done |
| 13 | CI, release integrity, hosted deployment configuration, human-only hardware documentation | 005, 053, 059, 068–071 | Blocked: L2-053 needs a host; L2-059 publication needs a tag |
| 14 | Requirement-by-requirement completion audit and full `npm run check`; verify pushed commits and release/deployment evidence where authorized | 001–071 | Blocked on the slice 0 and 13 owner decisions; all else verified |

Slices may be split further when verification reveals independent work; retain
the full scope and record each additional commit here. Shared foundational code
is introduced only when the next behavioral slice needs it.

## External inputs and completion gates

The hosted HTTPS URL and static host are unspecified in the designs. Request
these while independent work proceeds; do not invent a live deployment or claim
L2-053 verified without response/header/hash evidence. Hardware confirmation is
human-only, tracked separately from automated fake verification. Commit/push is
authorized; publishing a release or provisioning external hosting is not inferred
from that instruction.

Final evidence must map every acceptance criterion to behavioral checks, compiler,
linter/build enforcement, or explicit manual/external evidence. Passing a subset
does not establish completion. Record any unavailable external gate candidly.

## Execution record

- Planning: inspected repository, local guidance, skill, L2 requirements and design
  index; saved this plan before writing application code.
- Slice 0 runs in parallel (docs-only mocks and design system); product styles are
  taken from the existing mock kit and will be reconciled with its output.
- Slice 1: npm toolchain pinned (TypeScript 6.0.3 because typescript-eslint 8.73
  requires <6.1); `scripts/build.ts` type-checks, bundles, inlines fonts as data
  URIs, hashes the CSP, scans for banned APIs and enforces the size limit (first
  build 146,194 bytes). ESLint bans HTML sinks, network/storage APIs, impure globals
  in `src/protocol/` and cross-layer imports (probe files confirmed every rule fires,
  then were deleted). The fake `navigator.bluetooth` is bundled and installed with
  `addInitScript`; a guard fixture fails any test on page errors, console errors,
  unhandled rejections or a real `requestDevice`. Results: typecheck, lint, 3 unit
  tests and 6 acceptance tests pass. Default hosted URL
  `https://quinntynebrown.github.io/stride-link/stride-link.html` is a placeholder
  pending the owner's answer (override with `STRIDE_LINK_HOSTED_URL`).
- Slice 0 collision: another Claude session (docs-51) was writing mocks to
  `docs/mocks/` at the same time as this plan's slice 0 fork; the fork overwrote
  parts of that set and was stopped. Which set to keep is with the owner; slice 0 is
  on hold and nothing under `docs/mocks/` has been staged.
- Slice 2: pure chooser filters, variant/bike detection, hex and error facts (unit
  tests at 100 %); `PacketLog` with a page section for events outside a run,
  the L2-038 formatter, export builder and file name; on-screen log view; Blob
  download. 17 acceptance tests and 25 unit tests pass; lint and typecheck clean.
  The `[hidden]` rule was made authoritative after `.facts { display: grid }`
  overrode it.
- Slice 3: `BluetoothGateway.connect` discovers the service and characteristics
  under an abort signal and serialises attempts per device; `TreadmillLink` installs
  listeners before `startNotifications()` and copies each DataView; `WriteQueue`
  (unit-tested: order, one in flight, failure recovery, Stop first, clear) and a
  `Run` that owns timers and invalidates them on end. Playwright's clock is now
  paused after install, because an installed clock otherwise keeps flowing in real
  time and broke the 10 s boundary assertion. 25 acceptance and 30 unit tests pass.
- Slice 4: pure checksum, encoder (refuses speeds above 3 km/h as defence in depth
  behind the input validator), parser and a 10,000-array fuzz test; `InitSequencer`
  paces on reply or 300 ms and waits the full 300 ms after a failed write. 33
  acceptance and 86 unit tests pass; protocol coverage 100 % lines and branches.
- Slice 5: pure `solveChallenge`, `validateAuth` and `isAcknowledgement` with every
  unlock case unit-tested; `UnlockFlow` gives each attempt its own activation and
  window timers. Challenge length is checked before checksum (the design lists
  checksum first) so a 7- or 9-byte frame always reports `challenge length N` as
  L2-020 criterion 3 requires. Verdict effects land in slice 7. 46 acceptance and
  105 unit tests pass.
- Slice 6: `LinkKeeper` schedules keepalives against target times (no drift over
  256 ticks) and echoes D0/D2/D3 unchanged. The fake keeps the real
  `performance.now` (captured before Playwright's clock) to time the page's
  notification handler; p95 under 10 ms with 1,200 echoes and none dropped; a
  full run with 15 ms writes shows zero overlaps. The slice 6 commit went out with
  four init specs failing (keepalives now appear in their window; only the last
  line of the run was checked); fixed in the next commit. 54 acceptance tests pass.
- Slice 7: pure `decodeTelemetry` (100 % covered); `VerdictEngine` with the 3 s
  settle and 20 s silent timers, Silent final, unlock outcomes replacing Talks or
  Locked and logged as `Verdict changed: old -> new`; disconnection before a
  verdict yields Silent, Talks or Locked. The verdict card sits in a polite,
  atomic live region with its own Export log; telemetry is not live. L2 gives no
  status-line text for a reached verdict, so it reads "Connected to the
  treadmill." beside the card. 81 acceptance and 121 unit tests pass.
- Slice 8: on-screen log keeps a run heading above its remaining rows when trimming
  to 500; the scroller now uses normal column flow (the mock's `column-reverse`
  inverted `scrollTop` and broke follow/keep); `beforeunload` warns only with
  unexported entries. Filters and Clear named in this slice's row are not in
  L2-037..041, so per "the spec wins" they were not built. The one-hour run
  (72,000 notifications, echoes, keepalives) stays under 50 MB of heap measured
  through CDP, at most 500 rows, export starting in under 2 s; L2-057 criterion 3
  (Stop within 50 ms) is verified in slice 9 once Stop exists. Playwright pins
  `timezoneId: "UTC"` so export names are exact. 97 acceptance tests pass.
- Slices 9 and 10 (one commit: the speed and incline controls live inside the gate,
  so they could not be accepted apart from it): `BeltController` per run refuses
  Start, speed and incline unless the gate is offered and open, never refuses Stop,
  and sends Stop with `enqueueFirst`. The plan row says "unlock-only gate"; L2-042
  offers it under Talks or Unlocked, and the spec wins. Belt active = Start pressed
  or a decoded speed above 0; after Stop resolves only a speed reported since keeps
  it active. Disconnect waits for Stop or 1,000 ms; `pagehide` puts Stop first; a
  drop with the belt active shows the connection-lost banner until dismissed. Pure
  `parseSpeed`/`parseIncline` (100 % covered) plus the encoder's RangeError make the
  3 km/h cap two layers deep. Interlock tests: gate (belt-gate.spec), cap
  (belt-input.test, belt-commands.spec), Stop jumps the queue (belt-commands.spec,
  stop-on-end.spec), Stop on screen 320–1920 px at every scroll position and Escape
  from any focus (stop-reachable.spec), Stop within 50 ms after a one-hour session
  (long-session.spec). 135 acceptance and 146 unit tests pass.
- Slice 11: axe-core (tests only) runs against 14 page states in light and dark with
  zero serious or critical violations; it found `aria-label` on a bare `<span>` (the
  brand), now `role="img"`. Other fixes from the audits: telemetry moved above belt
  controls (L2-064 order); the gate checkbox is a 44 px target; the body clears the
  stop bar's border so nothing sits behind it. The probe measures focus rings
  (>= 2 px, >= 3:1), targets, label-in-name, reduced motion, breakpoints, rotation
  and 200 % zoom (640 CSS px). L2-062 "greyscale" is checked as luminance contrast
  (>= 4.5:1), which greyscale preserves; L2-067 "base body text" is the body, status
  line and subtitle, not the smaller notice. axe needs the page clock resumed, and
  probes scroll with `behavior: "instant"` because the page scrolls smoothly. 233
  acceptance tests pass.
- Slice 12: runtime checks that the build leaves one file under 204,800 bytes; that
  the page renders with its own fonts with the network off; that runs to all four
  verdicts plus an export request only the page document; that the declared CSP
  equals the policy recomputed from the page's own inline script and style; that an
  injected `fetch` raises a `connect-src` violation; that no inline style or `on*`
  attribute appears; that untrusted error text stays text; that storage is empty
  after a full run; and that a reopened file starts with an empty log. Startup
  under 4x CPU throttling enables Connect in under 1,000 ms with no task over
  200 ms. Each L2-058 failure is shown in plain words and logged with name and
  message. The static scans of L2-001 c2, L2-049 c2 and L2-052 c2 stay in
  `scripts/build-checks.ts` and ESLint, not tests (AGENTS.md); one ESLint exception
  covers only `e2e/page-objects/privacy-probe.ts`, which must call the banned APIs
  to prove they are blocked or unused. 252 acceptance tests pass.
- Slice 13: `ci.yml` runs `npm run check` on every push and pull request, rebuilds to
  prove the output is byte-identical (L2-068 c3), and stages and verifies the
  sha256sum file. `release.yml` on a `v*` tag checks the tag against package.json,
  repeats every check, stages `release/` (page + `stride-link.html.sha256`) and
  `hosted/` (page + `_headers` with HSTS, nosniff, no-referrer and the CSP plus
  `frame-ancestors 'none'`), and only then runs `gh release create`; any failed step
  publishes nothing (L2-059 c3). `scripts/verify-hosted.ts` checks a served copy
  for the http->https redirect, the headers and the release hash; the release runs
  it before publishing whenever `STRIDE_LINK_HOSTED_URL` is set. No job grants
  Bluetooth permission. The fake's named scripts now cover every L2-070 c2
  scenario. Not done, by instruction: no tag was pushed, no release published, no
  host provisioned. L2-053 stays open until the owner names the static host and
  hosted URL (the build still uses the placeholder
  `https://quinntynebrown.github.io/stride-link/stride-link.html`, and GitHub Pages
  cannot set these headers). `docs/manual-hardware-test.md` already lists the
  L2-071 steps in order and records browser, version and OS (L2-005 c2).
- Slice 14 audit: every L2 requirement from 001 to 069 is named by at least one
  unit or acceptance test; L2-070 and L2-071 constrain the harness, CI and docs and
  were checked by review, as AGENTS.md forbids architecture tests: every spec file
  opens with `// Traces to: L2-xxx`, the fixture fails any test that reaches the
  real `requestDevice`, no workflow or Playwright project grants Bluetooth
  permission, `docs/manual-hardware-test.md` lists the six steps in order, and
  AGENTS.md states the hardware rule. Local `npm run check`: typecheck, lint, 154
  unit tests (protocol 100 % lines and branches), build at 183,966 bytes, 252
  acceptance tests. GitHub Actions CI run 44848597636 on 491e35d passed, including
  the byte-identical rebuild and the sha256sum check; the actions moved to v5 after
  it warned about Node 20. Open items, both outside an agent's authority:
  - L2-053: the owner must name the static host and hosted URL; then add the deploy
    step and set `STRIDE_LINK_HOSTED_URL`. No release was tagged or published.
  - Slice 0: two sessions wrote conflicting mock sets into `docs/mocks/` (see the
    slice 0 note above). The owner must choose which set to keep before the design
    system is extracted. `docs/mocks/` was not staged by this work.
- Slice 0: `docs/design-system/` extracted from the shared mock assets and matched
  to the shipped styles: tokens (CSS and DTCG JSON, 270 entries), 12 foundations,
  29 components and 8 patterns. Contrast passes 172 of 172 checks (86 pairs, light
  and dark). Visual review: 200 screenshots of every page at 360 and 1280 px in
  both themes, with no sideways scroll, console errors or requests. The 84 mock
  files, pointed at the system's CSS in a scratch copy, match the originals pixel
  for pixel except set A's three belt toasts, which the system moves above the
  Stop bar on purpose. The extraction found five defects in the shipped page,
  all fixed in the next commit: a duplicate CSS rule, the privacy pill's double
  gap, a stretched Dismiss button, focus falling to the body after Dismiss, and
  Stop's label overflowing at 320 px. Both mock sets (set A: pages/start, run,
  verdict and belt; set B: pages/stride-link) stay in the working tree,
  unstaged, untouched since the collision note above. Choosing which set to keep,
  and committing it, is the owner's decision. The design system does not depend
  on that choice: both sets share the assets it was built from.
