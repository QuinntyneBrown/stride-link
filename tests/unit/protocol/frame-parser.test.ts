// Traces to: L2-015, L2-069
import { describe, expect, it } from "vitest";
import { parseFrame } from "../../../src/protocol/frame-parser.ts";
import { bytes } from "./hex-input.ts";

describe("L2-015 inbound frame parsing", () => {
  it.each([
    ["F0 D3 02 0B B8 88", "D3", 0xd3],
    ["F0 D2 01 05 C8", "D2", 0xd2],
    ["F0 D1 00 00 00 00 00 01 2C 00 00 48", "D1", 0xd1],
    ["F0 D0 01 07 C8", "D0", 0xd0],
    ["F0 E0 34 12 05 78 97 2A", "E0", 0xe0],
    ["F0 A4 00 94", "other", 0xa4],
  ])("classifies %s as %s by byte 1", (hex, kind, type) => {
    const parsed = parseFrame(bytes(hex));
    expect(parsed.kind).toBe(kind);
    expect(parsed.type).toBe(type);
    expect(parsed.malformed).toBe(false);
  });

  it("reports checksum validity", () => {
    expect(parseFrame(bytes("F0 D3 02 0B B8 88")).checksumValid).toBe(true);
    expect(parseFrame(bytes("F0 D3 02 0B B8 89")).checksumValid).toBe(false);
  });

  it.each(["A0 D3 02", "F0", "00"])("classifies %s as unknown", (hex) => {
    const parsed = parseFrame(bytes(hex));
    expect(parsed.kind).toBe("unknown");
    expect(parsed.type).toBeNull();
    expect(parsed.checksumValid).toBe(false);
  });

  it("classifies a zero-length array as empty", () => {
    expect(parseFrame(new Uint8Array(0)).kind).toBe("empty");
  });

  it.each([
    ["F0 D3 02 0B", "D3"],
    ["F0 D2 01", "D2"],
    ["F0 D0 01", "D0"],
  ])("marks %s malformed", (hex, kind) => {
    const parsed = parseFrame(bytes(hex));
    expect(parsed.kind).toBe(kind);
    expect(parsed.malformed).toBe(true);
  });

  it("never throws on 10,000 random byte arrays of length 0 to 512", () => {
    let seed = 0x5eed;
    const random = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed;
    };
    for (let i = 0; i < 10_000; i += 1) {
      const length = random() % 513;
      const data = new Uint8Array(length);
      for (let j = 0; j < length; j += 1) data[j] = random() & 0xff;
      if (length > 0 && i % 2 === 0) data[0] = 0xf0;
      expect(() => parseFrame(data)).not.toThrow();
      expect(parseFrame(data).kind).toMatch(/^(empty|unknown|D0|D1|D2|D3|E0|other)$/);
    }
  });
});
