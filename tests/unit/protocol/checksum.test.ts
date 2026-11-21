// Traces to: L2-013
import { describe, expect, it } from "vitest";
import { checksum, hasValidChecksum } from "../../../src/protocol/checksum.ts";
import { bytes } from "./hex-input.ts";

describe("L2-013 checksum", () => {
  it.each([
    ["F0 A4 00", 0x94],
    ["F0 E0 FD 3E 65 48 D5", 0x8d],
    ["F0 E0 34 12 05 78 97", 0x2a],
  ])("checksum of %s is %i", (hex, expected) => {
    expect(checksum(bytes(hex))).toBe(expected);
  });

  it("validates a frame whose last byte is its checksum", () => {
    expect(hasValidChecksum(bytes("F0 A4 00 94"))).toBe(true);
  });

  it("rejects a frame whose last byte differs", () => {
    expect(hasValidChecksum(bytes("F0 E0 34 12 05 78 97 2B"))).toBe(false);
  });

  it("marks frames shorter than 3 bytes invalid without throwing", () => {
    expect(hasValidChecksum(bytes(""))).toBe(false);
    expect(hasValidChecksum(bytes("F0"))).toBe(false);
    expect(hasValidChecksum(bytes("F0 F0"))).toBe(false);
  });
});
