// Traces to: L2-016
import { describe, expect, it } from "vitest";
import { toHex } from "../../../src/protocol/hex.ts";

describe("L2-016 hex formatting", () => {
  it("formats bytes as spaced uppercase pairs", () => {
    expect(toHex([0xf0, 0xa4, 0x00, 0x94])).toBe("F0 A4 00 94");
    expect(toHex(Uint8Array.of(0xf0, 0xa4, 0x00, 0x94))).toBe("F0 A4 00 94");
  });

  it("formats an empty array as the empty string", () => {
    expect(toHex([])).toBe("");
  });

  it("formats every byte from 0 to 255 as two uppercase hex digits", () => {
    for (let byte = 0; byte <= 255; byte += 1) {
      expect(toHex([byte])).toMatch(/^[0-9A-F]{2}$/);
      expect(parseInt(toHex([byte]), 16)).toBe(byte);
    }
  });
});
