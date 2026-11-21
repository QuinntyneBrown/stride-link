# Contributing to Stride Link

Thank you for your interest in Stride Link. This guide explains how to report problems,
propose changes and get a pull request merged.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Share a log.** If you own a Stride, run Stride Link and open an issue with your
  verdict and exported log. Logs from models and firmware we have not seen are the most
  valuable contribution of all.
- **Report a bug.** Use the bug report template and attach the exported log.
- **Propose a feature.** Open a feature request first, so it can be discussed against the
  [product requirements](docs/PRD-Stride-Link.pdf) before any code is written.
- **Submit a pull request.** Fix a bug, improve accessibility or tighten a test.

Workouts, classes, the Echelon bike, iOS support and any feature that sends data off the
device are out of scope and will not be accepted.

## Safety first

Never ask anyone, including a coding agent or CI, to run automated tests against a real
treadmill. Hardware testing is done by a person, following
[`docs/manual-hardware-test.md`](docs/manual-hardware-test.md). Pull requests that weaken
a belt interlock (the standing-clear gate, the 3 km/h cap or the always-visible Stop) will
not be merged.

## Development setup

1. Install [Node.js](https://nodejs.org/) 24 LTS.
2. Fork and clone the repository.
3. Install dependencies and browsers:

   ```bash
   npm ci
   npx playwright install chromium
   ```

4. Confirm everything passes before you change anything:

   ```bash
   npm run check
   ```

## Development workflow

Stride Link uses acceptance test-driven development. For every change:

1. **Start from the requirement.** Find the criteria in [`docs/specs/L2.md`](docs/specs/L2.md).
   If the behavior you want is not specified, propose a new or changed L2 requirement in
   the same pull request.
2. **Write a failing test.** A Vitest unit test for protocol code, a Playwright
   acceptance test for anything a tester can see. Start each acceptance spec with a
   `Traces to: L2-xxx` header comment.
3. **Make it pass** with the least code that satisfies the criteria.
4. **Run the full check** with `npm run check`.

[AGENTS.md](AGENTS.md) holds the full coding conventions. They apply to human and agent
contributors alike.

### Key conventions

- Strict TypeScript only.
- `src/protocol/` stays pure: no DOM, Bluetooth, timers or clocks.
- Every write to the treadmill goes through the write queue.
- Render device-supplied and error text with text nodes, never as HTML.
- No network requests and no browser storage, ever.
- In Playwright tests, keep selectors in page objects and use the clock API instead of
  sleeps.

## Pull request process

1. Create a branch from `main` with a descriptive name, for example
   `fix/keepalive-wrap` or `feat/stride4-d1-speed`.
2. Keep each pull request focused on one change.
3. Write commit messages in the imperative mood, for example
   `Echo D0 frames with invalid checksums`.
4. Fill in the pull request template, including the L2 requirements covered.
5. Make sure CI passes. A maintainer will review your change, usually within a week.

Pull requests are merged by squash. The release build must stay under 204,800 bytes.

## Reporting security issues

Do not report security vulnerabilities in public issues. Follow [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
