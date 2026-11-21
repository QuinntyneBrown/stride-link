# Detailed design review log

The requested review comprises 25 successive passes. Each completed pass records a concrete defect, its correction and verification. Remaining passes are pending.

| Pass | Finding and correction | Verification |
|---|---|---|
| 1 | The architecture overview made protocol depend on Bluetooth by saying dependencies point to lower table rows. Replaced that rule with explicit inward dependencies and transport callbacks, keeping protocol pure and transport independent of session policy. | Compared the revised dependency rule with AGENTS.md and L2-069; protocol has no outward layer dependency. |
| 2 | A timeout abandoned the promise but did not define cleanup for a late connection. Added attempt tokens, late-result cleanup and same-device retry isolation. | Walked timeout → retry → late success against L2-010 and L2-058; stale work cannot publish a link or disconnect a newer same-device link. |
| 3 | Subscription setup omitted listener ordering and partial-failure disposal. Added listener ownership, installation before subscription, disposal and idempotent teardown. | Walked f3 success → f4 failure and duplicate disconnect against L2-011 and L2-012; no init starts and listeners are removed. |

| 4 | Init paced after the final frame, delaying its completion timestamp and downstream timers. Limited pacing to frames with a successor. | L2-017 criterion 4: final write settlement now immediately records completion. |
| 5 | The sequence diagram allowed a notification to shorten the wait after a failed write. Added an explicit full-delay failure branch. | L2-019 criterion 2: failure plus immediate notification still waits 300 ms before the next frame. |
| 6 | Cancellation had no promise-settlement or continuation contract. Added a cancelled result, timer cleanup and guards against stale completion. | L2-012: cancellation during a pacing wait or in-flight write cannot enqueue another frame or start timers. |

| 7 | Export read live runs and marked the entire log exported. Added a bounded snapshot and monotonic exported-entry watermark. | L2-040/041: append during export and reverse-order export completion both retain the warning for uncaptured entries. |
| 8 | Download failures had no cleanup or exported-state rule. Defined failure propagation, resource disposal and success-only acknowledgement. | L2-058: Blob, URL and click failures preserve unexported state and reach the UI/log error boundary. |
| 9 | Raw log bytes and run arrays had no ownership contract. Added byte-range copying and immutable snapshot reads. | L2-037/040: mutating a caller buffer after record cannot alter retained or exported evidence. |

| 10 | D1 speed and heart rate occupied mutually exclusive sequence branches, losing heart rate on Stride 4. Replaced them with independent checks producing a combined update. | L2-029/031 shared sample now produces both 3.00 km/h and 72 bpm on Stride 4; standard produces only heart rate. |
| 11 | State application did not distinguish absent values from zero. Defined field-presence semantics explicitly. | L2-028 criterion 2 and L2-031 criterion 2: zero speed replaces previous speed; zero heart-rate payload preserves previous heart rate. |

Passes 12–25 remain pending. Connection, init and log diagrams rendered successfully. Telemetry diagram rendering pending.
