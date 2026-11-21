<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/stride-link-logo-dark.svg">
    <img src="docs/assets/stride-link-logo.svg" alt="Stride Link" width="480">
  </picture>
</p>

# Stride Link

[![CI](https://github.com/QuinntyneBrown/beltcheck/actions/workflows/ci.yml/badge.svg)](https://github.com/QuinntyneBrown/beltcheck/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/QuinntyneBrown/beltcheck)](https://github.com/QuinntyneBrown/beltcheck/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Stride Link is a single-file, offline web page that tests whether a browser can talk to an
Echelon Stride treadmill over Web Bluetooth. Open `stride-link.html` in Chrome or Edge,
pick your treadmill, and in under two minutes you get a plain-language verdict and a
packet log that shows exactly why.

> [!WARNING]
> Stride Link can send belt commands to a real treadmill. Use it only on a treadmill you
> own, keep the safety key within reach, and stand clear of the belt. See [Safety](#safety).

## Table of contents

- [Features](#features)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Verdicts](#verdicts)
- [Building from source](#building-from-source)
- [Testing](#testing)
- [Architecture](#architecture)
- [Privacy and security](#privacy-and-security)
- [Accessibility](#accessibility)
- [Safety](#safety)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Features

- **One file, no install.** A self-contained `stride-link.html` under 200 KB with every
  script, style and font inlined. No account, no server, no network access.
- **Full handshake.** Runs the qdomyos-zwift init sequence for the standard and Stride 4
  variants, answers the Echelon unlock challenge locally, and keeps the link alive.
- **Four clear verdicts.** Every run ends in **Silent**, **Talks**, **Unlocked** or
  **Locked**, with the reason and the next step written out.
- **Live telemetry.** Decodes speed, incline and heart rate once the treadmill talks.
- **Exportable packet log.** Every frame sent and received, with monotonic timestamps,
  in a diff-friendly text format you can compare against a capture of the official app.
- **Opt-in belt control.** Start, Stop, speed (capped at 3 km/h) and incline, locked
  behind an explicit "standing clear" confirmation, with Stop always on screen.
- **Accessible and responsive.** WCAG 2.2 AA, fully keyboard and touch operable, from
  320 px phones to wide desktop screens.

## Getting started

### Requirements

| Requirement | Supported |
| --- | --- |
| Browser | Current or previous stable Chrome or Microsoft Edge |
| Operating system | Windows, macOS, Linux, ChromeOS, Android |
| Hardware | A Bluetooth Low Energy adapter, switched on |
| Treadmill | An Echelon Stride (including Stride 4 models) |

Safari and iOS are not supported, because they do not implement Web Bluetooth.

### Download and verify

1. Download `stride-link.html` and `stride-link.html.sha256` from the
   [latest release](https://github.com/QuinntyneBrown/beltcheck/releases/latest).
2. Verify the download:

   ```bash
   sha256sum -c stride-link.html.sha256
   ```

   On Windows PowerShell, compare the output of
   `Get-FileHash stride-link.html -Algorithm SHA256` with the hash in the `.sha256` file.

3. Open `stride-link.html` in Chrome or Edge.

If your browser blocks Bluetooth for files opened from disk, the page says so and links
to the hosted copy, which is byte-identical to the release asset and served over HTTPS.

## Usage

1. Stand next to the treadmill with the safety key attached and within reach.
2. Open Stride Link and press **Connect**.
3. Choose your Stride in the browser's Bluetooth chooser. Echelon bikes are filtered out.
4. Watch the packet log as Stride Link subscribes, runs init and, if challenged, unlocks.
5. Read the verdict, its reason and the suggested next step.
6. Press **Export log** to save a `.txt` file such as
   `stride-link-STRIDE-8S-20261120-143205.txt`.

To try belt commands after a **Talks** or **Unlocked** verdict, tick
**I am standing clear of the belt**. Start, speed and incline controls then appear. Press
**Stop belt**, or **Escape** anywhere on the page, to stop the belt.

## Verdicts

| Verdict | Meaning | Next step |
| --- | --- | --- |
| **Silent** | No notification within 20 s of init | Export the log; capture the official app for comparison |
| **Talks** | Notifications arrive and no challenge was sent | Read telemetry; belt commands can be tried |
| **Unlocked** | Challenge answered and acknowledged | Read telemetry; belt commands can be tried |
| **Locked** | Challenge invalid or not acknowledged in 2.5 s | Export the log with the challenge bytes |

### Packet log format

Each line is `<ms> <DIR> <char> <hex> <tag>`, with milliseconds since the run started:

```text
      12.3 TX f2 F0 A4 00 94 init
     318.9 RX f4 F0 D3 02 00 00 C5
     320.4 TX f2 F0 D3 02 00 00 C5 echo
    2318.6 EV Init complete
```

## Building from source

### Prerequisites

- [Node.js](https://nodejs.org/) 24 LTS
- npm 10 or later

### Build

```bash
git clone https://github.com/QuinntyneBrown/beltcheck.git
cd beltcheck
npm ci
npm run build
```

The build writes `dist/stride-link.html`. Builds are reproducible: two builds of the same
commit produce byte-identical output. The build fails if the file reaches 204,800 bytes.

To set the URL of the hosted fallback copy, set `STRIDE_LINK_HOSTED_URL` before building.

### Available scripts

| Command | Description |
| --- | --- |
| `npm run build` | Compile, bundle and inline everything into `dist/stride-link.html` |
| `npm run typecheck` | Type-check the project with `tsc --noEmit` |
| `npm run lint` | Run ESLint, including the security rules |
| `npm test` | Run the Vitest unit suite with coverage |
| `npm run test:e2e` | Run the Playwright acceptance suite |
| `npm run check` | Run every check above |

## Testing

Stride Link is developed with acceptance test-driven development. Every requirement in
[`docs/specs/L2.md`](docs/specs/L2.md) has Given-When-Then acceptance criteria and a
matching test.

- **Unit tests** (Vitest) cover the pure protocol module at 100 % line and branch
  coverage, with a test for every frame and every unlock case.
- **Acceptance tests** (Playwright on Chromium) drive the real page against a scriptable
  fake `navigator.bluetooth` that reproduces each verdict and failure. Timing is tested
  with Playwright's clock API, so the suite never sleeps.
- **Accessibility tests** run axe-core against every page state.

```bash
npx playwright install chromium
npm test
npm run test:e2e
```

Automated tests never touch real Bluetooth hardware. Testing against a real treadmill is
a manual, human-only activity described in
[`docs/manual-hardware-test.md`](docs/manual-hardware-test.md).

## Architecture

Stride Link is a single page with four layers. Dependencies point inward toward the
protocol module.

| Layer | Folder | Responsibility |
| --- | --- | --- |
| Protocol | `src/protocol/` | Pure frame encoding, parsing, checksums, unlock arithmetic and telemetry decoding |
| Bluetooth | `src/ble/` | The only code that touches `navigator.bluetooth`; serialised write queue |
| Session | `src/session/` | Run state machine, init pacing, unlock, keepalive, verdicts and the packet log |
| UI | `src/ui/` | Panels, status announcements and belt controls |

C4, class and sequence diagrams for every feature live in
[`docs/detailed-designs/`](docs/detailed-designs/).

## Privacy and security

- **Nothing leaves your device.** The page makes no network requests, and its Content
  Security Policy (`default-src 'none'`) blocks any attempt to.
- **Nothing is stored.** The log lives in memory until you export it. No cookies, local
  storage or IndexedDB.
- **Untrusted input stays text.** Device names and error messages are always rendered as
  text, never as HTML.

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Accessibility

Stride Link meets WCAG 2.2 AA. Every control works by keyboard and touch with targets of
at least 44 x 44 px, verdicts are always written in words rather than shown by colour,
status changes are announced to screen readers, and animation honours
`prefers-reduced-motion`.

## Safety

- Use Stride Link only on a treadmill you own.
- Keep the treadmill's safety key attached and within reach for the whole session.
- Belt controls stay hidden until you confirm you are standing clear of the belt.
- Speed is capped at 3 km/h.
- **Stop belt** stays on screen whenever the belt may be moving, and **Escape** stops it.
- If the connection drops while the belt is moving, use the treadmill's stop button or
  safety key immediately.

## Documentation

| Document | Description |
| --- | --- |
| [Product requirements](docs/PRD-Stride-Link.pdf) | Goals, protocol reference and risks |
| [L1 requirements](docs/specs/L1.md) | High-level requirements |
| [L2 requirements](docs/specs/L2.md) | Detailed requirements with acceptance criteria |
| [Detailed designs](docs/detailed-designs/) | Per-feature architecture and diagrams |
| [Manual hardware test](docs/manual-hardware-test.md) | Checklist for testing on a real treadmill |
| [Changelog](CHANGELOG.md) | Release history |

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development
workflow and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations. For
help, see [SUPPORT.md](SUPPORT.md).

## License

Stride Link is licensed under the [MIT License](LICENSE).

## Acknowledgements

The Echelon protocol, init sequence and challenge/response unlock follow
[qdomyos-zwift](https://github.com/cagnulein/qdomyos-zwift) at commit `a23bb20`. The
unlock algorithm is credited to Christian Emerson.

## Trademarks

Echelon and Stride are trademarks of their respective owners. Stride Link is an
independent project and is not affiliated with, endorsed by or sponsored by Echelon
Fitness. Use of these names is for identification only.
