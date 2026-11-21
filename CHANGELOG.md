# Changelog

All notable changes to Stride Link are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-11-20

### Added

- Single self-contained `stride-link.html` release with a published SHA-256 checksum.
- Web Bluetooth support detection with plain-language messages and a hosted fallback.
- Treadmill discovery filtered to Echelon Strides, with Echelon bikes rejected.
- Standard and Stride 4 variant detection and init sequences.
- Local challenge/response unlock with acknowledgement checking.
- Counting keepalive and echo replies for D0, D2 and D3 frames.
- Speed, incline and heart-rate decoding.
- Silent, Talks, Unlocked and Locked verdicts with reasons and next steps.
- Live packet log and plain-text log export.
- Opt-in belt controls with a 3 km/h cap and an always-visible Stop.
- Strict Content Security Policy, no network requests and no persistence.
- WCAG 2.2 AA accessibility and responsive layout from 320 px upward.

[Unreleased]: https://github.com/QuinntyneBrown/beltcheck/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/QuinntyneBrown/beltcheck/releases/tag/v1.0.0
