# Stride Link design system

Extracted from [docs/mocks](../mocks/README.md) on 2026-11-20 and checked against
the shipped page (`src/styles/tokens.css`, `kit.css`, `app.css`, `src/index.html`).
Open [index.html](index.html) locally. It needs no network: fonts, icons and
styles are all inside this folder.

> **The owner has yet to choose the mock set.** `docs/mocks/` holds two
> overlapping mock sets written by two sessions:
>
> - **Set A**: `pages/start`, `pages/run`, `pages/verdict`, `pages/belt`,
>   `dialogs/chooser`, `dialogs/connection-lost`, `dialogs/leave-page`,
>   `notifications/belt-toast`, `export-toast`, `verdict-toast`.
> - **Set B**: `pages/stride-link` (27 states), `dialogs/bluetooth-chooser`,
>   `notifications/connection-lost`, `notifications/stop-failed`.
>
> Both share `docs/mocks/assets/tokens.css`, `ui.css` and
> `contrast-pairs.json`, and this system is built on those shared files. Every
> component that appears in either set is documented here. Neither set's page
> structure is preferred: where the two sets differ, the pages show both side by
> side and say what the shipped page does. Where the shipped page differs from
> both, the system follows the shipped page and records the difference below.

## Foundations

| Page | Covers |
|---|---|
| [Color](foundations/color.html) | Ink, paper and signal ramps, semantic roles, status colours, both themes and all 86 checked contrast pairs |
| [Typography](foundations/typography.html) | Inter Tight and JetBrains Mono, the type scale, weights, role shorthands and the 16 px body floor |
| [Spacing](foundations/spacing.html) | The 4 px scale, inside-versus-between rules and padding by component |
| [Layout](foundations/layout.html) | L1-014 breakpoints, columns, gutters, margins, the 720 / 1140 px caps and the one-page template |
| [Elevation](foundations/elevation.html) | Four shadows, the surface hierarchy and z-order, including the Stop bar layer |
| [Shape](foundations/shape.html) | Radii, border widths and the 4 px accent bar |
| [Motion](foundations/motion.html) | Durations, easings, the pulse and spin loops and reduced motion |
| [Iconography](foundations/iconography.html) | The 24-unit stroke icons from both sets, the brand mark and labelling rules |
| [Theming](foundations/theming.html) | Light and dark, `data-theme`, `prefers-color-scheme`, more-contrast and forced-colours modes, `tokens.json` |
| [Responsive](foundations/responsive.html) | One column, capped single column and two columns: what each component does at each breakpoint |
| [Accessibility](foundations/accessibility.html) | The WCAG 2.2 AA commitments, L2-060 to L2-067, and how they are tested |
| [Content](foundations/content.html) | Voice, the L2 microcopy character for character, numbers, units and error formulas |

## Components

"Shipped" means the component is on the built page. "Mocks only" means it
appears in one or both mock sets but not on the built page; it is documented so
the owner can decide.

| Component | Variants | States | Source mocks | Shipped |
|---|---|---|---|---|
| [Button](components/button.html) | primary, secondary, link, danger; sm, md, lg | default, hover, focus, active, disabled, busy (mocks only, never on Stop) | A and B, every page | Yes |
| [Link](components/link.html) | inline, hosted-copy link (`a.btn.btn--link`) | default, hover, focus, visited | A `start/blocked`, B `blocked-from-disk` | Yes |
| [Text field](components/text-field.html) | speed, incline (numeric) | default, focus, invalid, disabled | A `belt/*`, B `belt-active`, `invalid`, `speed-capped` | Yes |
| [Checkbox](components/checkbox.html) | choice, belt-gate interlock (44 × 44) | unchecked, checked, focus, disabled | A `belt/*`, B `gate-open`, `gate-closed-active` | Yes |
| [Form field](components/form-field.html) | with help, with error | default, invalid | A `belt/invalid*`, B `invalid` | Yes |
| [Inline message](components/inline-message.html) | help, error, inline status | shown, hidden | A `belt/invalid`, A chooser, B chooser | Yes (help, error) |
| [Top bar](components/top-bar.html) | one | default, sticky | A and B, every page | Yes |
| [Brand lockup](components/brand.html) | mark plus wordmark | default (not a link) | A and B, every page | Yes |
| [Privacy pill](components/privacy-pill.html) | shipped text; A icon + "Offline"; B "Local only" | shown | A and B, every page | Yes |
| [Skip link](components/skip-link.html) | one | hidden, focused | A and B | No (mocks only) |
| [Footer](components/footer.html) | build identity | shown | A and B, every page | Yes |
| [Layout primitives](components/layout-primitives.html) | app grid, primary column, log column, stack, cluster | one and two columns | A and B, every page | Yes |
| [Panel](components/panel.html) | with header, with actions | default | A and B, every page | Yes |
| [Dialog](components/dialog.html) | browser chooser (A and B), connection-lost alert dialog (A), leave-page (B) | scanning, found, selected, none found | A `dialogs/*`, B `dialogs/*` | No (browser-drawn or mocks only) |
| [Description list](components/description-list.html) | run facts, verdict facts | empty value, filled | A `run/*`, B `connecting` onward | Yes |
| [Badge](components/badge.html) | neutral, accent, info, success, warning, danger (soft only) | shown | A and B | No (mocks only) |
| [Status line](components/status-line.html) | neutral dot; tone dots (mocks only) | idle, busy, done, failed | A and B, every page | Yes |
| [Notice](components/notice.html) | ownership notice, advisory | shown | A and B | Yes |
| [Telemetry](components/telemetry.html) | speed, incline, heart rate | no reading, reading, edge | A `run/*`, B `unlocked`, `edge` | Yes |
| [Verdict](components/verdict.html) | Silent, Talks, Unlocked, Locked; pending (B), waiting (A) | hidden, pending, shown | A `verdict/*`, `run/awaiting`, B `silent`, `talks`, `unlocked`, `locked`, `awaiting-verdict` | Yes (four verdicts) |
| [Packet log](components/packet-log.html) | TX, RX, EV lines; run headings | empty, filling, long | A and B, every page | Yes |
| [Device list](components/device-list.html) | named, unknown device | default, selected, focus | A chooser, B chooser | No (browser-drawn) |
| [Belt controls](components/belt-controls.html) | standard, Stride 4 | gate closed, gate open, active, invalid, capped | A `belt/*`, B `gate-*`, `belt-active`, `speed-capped` | Yes |
| [Stop bar](components/stop-bar.html) | shipped; stop failed (shipped line, B in-bar alert, A page alert) | hidden, shown, failed; never disabled or busy | A `belt/*`, B `belt-active`, `notifications/stop-failed` | Yes |
| [Alert](components/alert.html) | info, success, warning, danger; banner (B) | shown, dismissed | A and B error states, B `notifications/connection-lost` | Yes |
| [Toast](components/toast.html) | info, success, warning, danger; with action | entering, shown, leaving | A `notifications/*-toast` | No (mocks only) |
| [Progress bar](components/progress-bar.html) | determinate | 0 to 100 % | A `run/awaiting` | No (mocks only) |
| [Spinner](components/spinner.html) | inline | spinning, reduced motion | A and B chooser, A `start/loading` | No (mocks only) |
| [Empty state](components/empty-state.html) | empty log, empty telemetry, empty chooser | empty | A and B default states | Yes |

## Patterns

| Pattern | Covers |
|---|---|
| [Forms](patterns/forms.html) | Apply-on-press numeric fields, validation timing, error placement and the interlock |
| [Feedback and loading](patterns/feedback-and-loading.html) | Which feedback for which event: status line, alert, verdict, toast, spinner, progress |
| [Empty and error states](patterns/empty-and-error-states.html) | Unsupported, Bluetooth off, blocked, failed and empty states, with the L2 copy |
| [Navigation and page structure](patterns/navigation-and-page-structure.html) | The single page: landmarks, reading order, heading outline and focus order |
| [Dialogs and overlays](patterns/dialogs-and-overlays.html) | Browser-native dialogs, the connection-lost choice and the Stop bar layer |
| [Data tables and lists](patterns/data-tables-and-lists.html) | The packet log, fact lists and the chooser list; why there are no tables |
| [Notifications](patterns/notifications.html) | Live regions, alerts, banners and proposed toasts: priority and persistence |
| [Content and tone](patterns/content-and-tone.html) | Plain words, L2 strings verbatim, hex and number formatting |

### Core components that do not apply

The skill's catalogue stars some core components that neither mock set nor the
shipped page uses. They have no page, because there is nothing to extract;
[index.html](index.html#not-applicable) lists each with its reason: menu,
select, radio group, switch, textarea, combobox, date picker, file input,
slider, sidebar navigation, tabs, breadcrumb, pagination, data table, tooltip,
avatar, chip, skeleton and card grid. Their CSS exists in the shared mock kit
(`docs/mocks/assets/ui.css`) but no mock or shipped screen uses them.

## Tokens

- `tokens/tokens.css`: the source of truth. 216 custom properties, light and
  dark, plus more-contrast and forced-colours blocks.
- `tokens/tokens.json`: the DTCG export (270 entries across both themes),
  regenerated with `tokens_to_json.py`.
- `tokens/contrast-pairs.json`: the 86 foreground and background pairs that are
  checked in both themes.
- `assets/components.css`: component styles. Rules are marked "Shipped:"
  where they follow `src/styles/` rather than the mocks, and "Mocks only" where
  the component is not on the built page.
- `assets/ds.css` and `assets/ds.js`: the documentation chrome only (shell,
  previews, live token and contrast cells, theme switch). Product code must not
  use them.
- `assets/fonts/`: Inter Tight and JetBrains Mono (latin subsets) with their
  OFL licences, copied from the mocks.

### How tokens.css differs from src/styles/tokens.css

Every other line is the shipped file, unchanged:

1. The `@font-face` URLs point at `../assets/fonts/`, to suit this folder.
2. Four tokens are added: `--color-info-icon-on-inverse`,
   `--color-success-icon-on-inverse`, `--color-warning-icon-on-inverse` and
   `--color-danger-icon-on-inverse`. Without them, the mocks' toast icons
   measure 1.47:1 to 1.88:1 on the dark theme's inverse surface, below the 3:1
   minimum for icons. Toasts are mocks only, so the shipped page needs none of
   them today.
3. The light block's selector is `:root, [data-theme="light"]`, so a light
   specimen nested inside a dark page resolves light values. The shipped page
   has no theme switch, so this changes nothing there.

## Shipped versus mocks

Where the two disagree, the system documents the shipped behaviour. These
differences apply to both mock sets unless a set is named.

| Area | Mocks | Shipped (documented here) |
|---|---|---|
| Packet log direction | `flex-direction: column-reverse` | `column`; script keeps the newest line in view while the reader is at the bottom, and keeps their place when they have scrolled up |
| Packet log lines | Spans for time, direction and bytes, 11ch hanging indent, coloured spans, a legend | One text node per line in the L2-038 format, 1ch hanging indent, no legend; line modifiers have no visual effect; headings "Run n · device" and "Page events" |
| Belt gate checkbox | 20 px box | 44 × 44 px box with a 1.25rem tick |
| Space reserved for the Stop bar | `padding-bottom` equals the bar height | Bar height plus `--space-2` |
| Stop failed | B: a danger alert inside the bar; A: a page alert and a meta line | `p.stop-bar__error role="alert"` beside the button; the button stays enabled |
| Stop bar row | Wraps (shared `ui.css`) | Does not wrap; the system wraps it only when set B's in-bar alert is present |
| Stop bar meta line | Present in both sets | None |
| Stop button name | A: `aria-label` plus a visible `kbd` | Visible text "Stop belt" with a `kbd` hint that is hidden from assistive technology; `aria-keyshortcuts="Escape"` |
| Brand | B: a link to `default.html`; A: a bare `div` read as "StrideLink"; 24 px | `span role="img" aria-label="Stride Link"`, wordmark `aria-hidden`, 20 px, not a link |
| Privacy pill | A: lock icon and "Offline"; B: lock icon and "Local only" | "Offline", extended to "Offline · nothing leaves this device" from 576 px; no icon |
| Footer | A: repeats the privacy promise; B: a qdomyos-zwift line | Version · commit only |
| Skip link | Present in both sets | Not on the shipped page; recorded as an open difference |
| Page heading | A: "Connectivity smoke test"; B: an intro above a "Status" panel | `h1` "Treadmill smoke test" inside the status panel |
| Status line | Short words ("Connected", "Connection failed") and `status--idle` (A) or `status--neutral` (B), classes no stylesheet defines | The full L2 sentence in the polite status line; one neutral dot, no tone modifiers |
| Verdict | Word is `p` (A) or `h3` (B), with an icon; B shows "No verdict yet."; A shows a progress bar while waiting | Word is an `h2`, no icon; the card is hidden until a verdict exists |
| Export log | A places it outside the verdict card | Inside the verdict card (L2-036) |
| Connection lost | A: modal alert dialog; B: banner | Inline `alert--danger` with a small Dismiss button |
| Telemetry | A: no space before the unit ("0.00km/h"); hidden "No reading yet" text | "value unit" with a space; a dash only |
| Description list | A: "Variant" term and a wall-clock "Run" row | "Model variant", no Run row |
| Belt labels and help | A: "Start belt", "Apply", help with no comma | "Start", "Set speed", "Set incline"; help "0 to 3 km/h, in steps of 0.1" |
| Hosted copy | B: the raw URL as link text | `a.btn.btn--link` "Open the hosted copy" |
| Reduced motion | Animations set to 0 s | `animation: none` and `transition: none` on everything (L2-063) |
| `[hidden]` | No rule | `[hidden] { display: none !important; }` |
| Kit contents | Toast, dialog, banner, badge, progress, spinner, device list and the rest of `ui.css` | The shipped kit drops these; the system keeps them as "Mocks only" |

### Findings in the shipped page

Recorded only. Nothing in `src/` was changed.

- `.stop-bar__error` is declared twice in `src/styles/app.css`, once inside a
  media query.
- The privacy pill shows a double gap before "·": the flex `gap` adds to the
  `&nbsp;` in the markup.
- The connection-lost Dismiss button stretches to the height of the wrapped
  alert text on phones, because `.alert` uses the default `align-items:
  stretch`. A fix would be `.alert > .btn { align-self: flex-start; }`.
- After Dismiss, focus falls to the document body. Moving it to Connect would
  keep keyboard users in place.
- At 320 px the Stop button's label and `Esc` hint are 3 px wider than the
  button (156 px of content in a 153 px button). At 360 px and wider it fits.

## Drift found in the mocks

The mocks were not changed. They are left untouched, as another session asked.

| Mock | Issue | Resolution |
|---|---|---|
| A `belt/*` | Each field is its own `<form novalidate>` with a submit button labelled "Apply" | Plain `div.field` with "Set speed" and "Set incline" buttons (B and shipped) |
| A `belt/invalid` | Error comes before help in the page and in `aria-describedby` | Help first, then error |
| A `belt/submitting` | Stop belt is `aria-busy`, which suggests a second Stop is blocked | Rejected: Stop is never busy (L2-044); a rule and a do/don't say so |
| A `notifications/belt-toast` | At 360 px the toast covers Stop belt | Fixed in `components.css`: with a Stop bar on screen, toasts sit above it |
| A toasts | `role="alert"` nested in a polite region; action buttons about 29 px tall; actions inside auto-dismissing toasts | No nested role; actions are 44 px; no timer when a toast has an action |
| A toasts | Icons fail 3:1 in dark (1.47:1 to 1.88:1) | New `--color-*-icon-on-inverse` tokens |
| A `dialogs/chooser`, `dialogs/connection-lost` | Inline `style` attributes on the heading block, which the CSP forbids | `.dialog__heading` class |
| A `run/*` | Inline `style="--value: …"` on the progress bar; waiting card marked `aria-live` | Width set by a class or by script; the card is not a live region |
| A `run/awaiting` | Progress fill (accent on the track) measures 2.47:1 in light | Fill uses `--color-accent-border` (3.47:1) |
| A and B `ui.css` | Solid badge label measures 3.57:1 in light | Solid badge left out of the system; soft badges only |
| A and B `ui.css` | 40rem and 64rem media queries that are not L1-014 breakpoints | 40rem kept only in the mocks-only dialog and toast rules; 64rem rules dropped |
| A and B `ui.css` | `.sidebar-layout` uses `--layout-sidebar-width`, which no tokens file defines | Not part of this system |
| A vs B | Duplicate icon drawings: lock / lock-b, unlock-a / unlock, bluetooth / bluetooth-b, shield-check / shield | Both shown on Iconography; the owner picks one of each with the mock set |
| A vs B | Two class names for the scanning line, `.inline-status` and `.chooser__scan` | Both kept until the owner picks a set |
| A `dialogs/chooser` | Pair is secondary, gets initial focus and stays enabled while scanning | Recorded; the docs recommend a disabled Pair until a device is chosen |
| B `dialogs/bluetooth-chooser` | Primary Pair, initial focus on Cancel | Recorded |
| A panels | Most panels have no `.panel__header` | Always use a header row (B and shipped) |
| B `chooser-cancelled` | An info alert for "No treadmill selected." | Status line only |
| B `notifications/connection-lost/danger.html`, `notifications/stop-failed/danger.html` | Link to a `default.html` that does not exist | Noted only |
| A and B | Empty-log wording differs between sets | Shipped matches set B |
| `docs/mocks/manifest.json` | Lists only set B; the checker reports the 51 set A files as orphans | Noted only |

## Verification

Run on 2026-11-20 from the repository root.

- **Structure:** `python3 .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system`:
  50 pages (12 foundations, 29 components, 8 patterns, index), 0 errors, 0 warnings.
- **Contrast:** `python3 .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css`:
  172 passed, 0 failed, 0 unresolved (86 pairs in light and dark). No pair fails AA.
  The thinnest margins, all above their 3:1 minimum for non-text parts, are:
  `--color-accent` on surface 3.15:1 and on raised 3.29:1 (light; ticked
  checkbox, busy dot), `--color-border-strong` on sunken 3.44:1 (light),
  `--color-accent-border` on the progress track 3.47:1 (light), the
  `-icon-on-inverse` tokens 3.57:1 to 3.65:1. The info border's minimum is 1:1
  because it is decorative. Every component page also shows live ratios,
  computed in the browser, for the pairs it uses.
- **DTCG export:** `tokens_to_json.py` wrote 270 tokens; the output matches the
  committed `tokens.json` byte for byte.
- **Offline and policy:** no `http` or `https` URL in any page, stylesheet or
  script (the only ones are in the SVG namespace and the font licence texts);
  no inline `style` attribute; no `on*` handler. Headless Chromium loaded every
  page with all network requests blocked and recorded no console errors and no
  external requests.
- **Screenshots:** every page at 360 and 1280 px, light and dark (200
  screenshots): no horizontal page scroll. Wide tables scroll inside their own
  frame at 360 px. Spot checks of index, color, button, dialog, stop bar and
  verdict found and fixed dimmed dialog previews, hidden anatomy markers,
  unreadable ramp labels and squeezed state tables.
- **Mocks loop:** the skill asks for the mocks to be repointed at these tokens.
  `docs/mocks/` is off limits, so instead a scratch copy of all 84 mock files
  was pointed at `tokens/tokens.css` and `assets/components.css` and
  pixel-compared with the originals at 360 and 1280 px in both themes, with a
  small stylesheet that reverts the documented shipped differences above.
  81 of 84 are identical in every combination. The three that differ are set
  A's belt toasts, which the system deliberately lifts above the Stop bar.
- **Mocks checker (read only):** `python3 .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks`
  reports 53 errors in `docs/mocks/`: 51 orphans (set A files missing from
  `manifest.json`) and 2 broken links to `default.html`. They were not fixed,
  because `docs/mocks/` must stay untouched.

## Changelog

- 2026-11-20: First extraction. Tokens, 12 foundations, 29 components, 8
  patterns, DTCG export and contrast verification. Built from both mock sets
  and aligned with the shipped page.
