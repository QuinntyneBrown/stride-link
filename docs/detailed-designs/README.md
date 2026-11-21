# Stride Link — detailed designs

Stride Link is a single downloadable web page that connects to an Echelon Stride treadmill over Web Bluetooth. It runs the init and unlock handshake and reports one of four verdicts: **Silent**, **Talks**, **Unlocked** or **Locked**. The designs below refine the requirements in `docs/specs/L1.md` and `docs/specs/L2.md`. The product source is `docs/PRD-Stride-Link.pdf`.

## Architecture in one page

Stride Link has no backend. Everything runs in Chrome or Edge from one HTML file, and nothing leaves the device (L2-049). The TypeScript source is split into four layers, and each layer depends only on the layers below it in this table:

| Layer | Folder | Responsibility | Examples |
|-------|--------|----------------|----------|
| UI layer | `src/ui/` | DOM rendering, input, announcements, downloads | `AppShell`, `ConnectPanel`, `VerdictPanel`, `TelemetryPanel`, `BeltPanel`, `StopBar`, `LogView`, `SafeDom` |
| Session core | `src/session/` | Run orchestration, timing, verdict, log, belt safety; no DOM | `RunController`, `InitSequencer`, `UnlockFlow`, `LinkKeeper`, `VerdictEngine`, `BeltController`, `PacketLog`, `Clock` |
| Protocol module | `src/protocol/` | Pure codec: frames, checksum, unlock arithmetic, telemetry; no DOM, Bluetooth, timers or clock | `FrameEncoder`, `FrameParser`, `UnlockCodec`, `TelemetryDecoder`, `ChooserFilters` |
| Bluetooth adapter | `src/ble/` | The only code that touches `navigator.bluetooth` | `BluetoothGateway`, `TreadmillLink`, `WriteQueue` |

The session core reaches time only through the `Clock` interface, so Playwright's clock API can drive every timing requirement.

### Sequence diagram colour key

The house sequence template separates frontend from backend tiers. Stride Link has no backend, so its boxes name the layer inside the page, coloured as follows:

| Box | Colour |
|-----|--------|
| `Frontend — Stride Link UI layer` | `#E0F2FE` |
| `Frontend — Stride Link session core` | `#D1FADF` |
| `Frontend — Stride Link protocol module` | `#ECFDF3` |
| `Frontend — Stride Link Bluetooth adapter` | `#FFF4E5` |
| `External — Chrome or Edge`, `Device — Echelon Stride treadmill` | `#F2F4F7` |
| `Build`, `CI`, `Test`, `Hosting` (build-test-release, protect-privacy) | as labelled |

## Subsystems and features

| Subsystem | Feature | L2 requirements |
|-----------|---------|-----------------|
| `connection` | [Check Bluetooth support](connection/check-bluetooth-support/README.md) | L2-002, L2-003, L2-004, L2-005, L2-054 |
| `connection` | [Select a treadmill](connection/select-treadmill/README.md) | L2-006, L2-007, L2-008, L2-009 |
| `connection` | [Manage the connection](connection/manage-connection/README.md) | L2-010, L2-011, L2-012, L2-058 |
| `protocol` | [Encode and parse frames](protocol/encode-and-parse-frames/README.md) | L2-013, L2-014, L2-015, L2-016, L2-069 |
| `handshake` | [Run the init sequence](handshake/run-init-sequence/README.md) | L2-017, L2-018, L2-019 |
| `handshake` | [Unlock the treadmill](handshake/unlock-treadmill/README.md) | L2-020 to L2-025 |
| `handshake` | [Keep the link alive](handshake/keep-link-alive/README.md) | L2-026, L2-027, L2-055, L2-056 |
| `diagnostics` | [Decode telemetry](diagnostics/decode-telemetry/README.md) | L2-028 to L2-032 |
| `diagnostics` | [Determine the verdict](diagnostics/determine-verdict/README.md) | L2-033 to L2-036 |
| `diagnostics` | [Record and export the packet log](diagnostics/record-and-export-log/README.md) | L2-037 to L2-041, L2-057 |
| `belt-control` | [Gate the belt controls](belt-control/gate-belt-controls/README.md) | L2-042 |
| `belt-control` | [Start and stop the belt](belt-control/start-and-stop-belt/README.md) | L2-043, L2-044, L2-045, L2-048 |
| `belt-control` | [Set speed and incline](belt-control/set-speed-and-incline/README.md) | L2-046, L2-047 |
| `platform` | [Protect privacy and integrity](platform/protect-privacy/README.md) | L2-049 to L2-053 |
| `platform` | [Accessible, responsive layout](platform/accessible-responsive-layout/README.md) | L2-060 to L2-067 |
| `platform` | [Build, test and release](platform/build-test-release/README.md) | L2-001, L2-059, L2-068, L2-070, L2-071 |

Each of the 71 L2 requirements appears in exactly one feature.

## Open items

- Hosted copy URL and static host: `<TO SUPPLY>` (PRD open question on where the release lives).
- Repository home: `<TO SUPPLY>` (new repository, or a second Wattzup application behind an ADR).
- Full Echelon UUIDs, frame bytes and the acknowledgement rule are Observed from qdomyos-zwift `a23bb20`. They are not yet confirmed on a Stride.
