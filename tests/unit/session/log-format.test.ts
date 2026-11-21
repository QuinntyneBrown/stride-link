// Traces to: L2-038
import { describe, expect, it } from "vitest";
import { formatEntry } from "../../../src/session/log-format.ts";

describe("L2-038 log line format", () => {
  it("formats the first init write at 12.34 ms", () => {
    expect(formatEntry({ dir: "TX", t: 12.34, bytes: Uint8Array.of(0xf0, 0xa4, 0x00, 0x94), tag: "init" })).toBe("      12.3 TX f2 F0 A4 00 94 init");
  });

  it("formats a notification on f4", () => {
    expect(formatEntry({ dir: "RX", t: 318, char: "f4", bytes: Uint8Array.of(0xf0, 0xa4, 0x00, 0x94) })).toBe("     318.0 RX f4 F0 A4 00 94");
  });

  it("formats an event", () => {
    expect(formatEntry({ dir: "EV", t: 318.44, text: "isNotifying f3: true" })).toBe("     318.4 EV isNotifying f3: true");
  });

  it("adds the error to a failed write", () => {
    expect(
      formatEntry({ dir: "TX", t: 1, bytes: Uint8Array.of(0xf0, 0xa1, 0x00, 0x91), tag: "init", error: { name: "NetworkError", message: "failed" } }),
    ).toBe("       1.0 TX f2 F0 A1 00 91 init write failed NetworkError: failed");
  });

  it("marks empty and noted notifications", () => {
    expect(formatEntry({ dir: "RX", t: 2, char: "f3", bytes: new Uint8Array(0) })).toBe("       2.0 RX f3 (empty)");
    expect(formatEntry({ dir: "RX", t: 2, char: "f3", bytes: Uint8Array.of(0xf0, 0xd2, 0x01), note: "malformed" })).toBe("       2.0 RX f3 F0 D2 01 malformed");
  });
});
