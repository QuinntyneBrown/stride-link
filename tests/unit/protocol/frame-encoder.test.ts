// Traces to: L2-014, L2-017, L2-018, L2-043, L2-046, L2-047, L2-069
import { describe, expect, it } from "vitest";
import {
  activation,
  bcd,
  beltStart,
  beltStop,
  initSequence,
  keepalive,
  targetIncline,
  targetSpeed,
  unlockResponse,
} from "../../../src/protocol/frame-encoder.ts";
import { toHex } from "../../../src/protocol/hex.ts";

const hexes = (frames: Uint8Array[]): string[] => frames.map((f) => toHex(f));

describe("L2-014 init frames", () => {
  it("encodes A4, A1 and A3 in the standard sequence", () => {
    expect(hexes(initSequence("standard"))).toEqual([
      "F0 A4 00 94",
      "F0 A1 00 91",
      "F0 A1 00 91",
      "F0 A1 00 91",
      "F0 A1 00 91",
      "F0 A3 00 93",
      "F0 A1 00 91",
    ]);
  });

  it("encodes the Stride 4 sequence with its fixed E0 frame", () => {
    expect(hexes(initSequence("stride4"))).toEqual([
      "F0 A4 00 94",
      "F0 A4 00 94",
      "F0 E0 FD 3E 65 48 D5 8D",
      "F0 A4 00 94",
      "F0 A1 00 91",
      "F0 A1 00 91",
      "F0 A1 00 91",
      "F0 A1 00 91",
      "F0 A3 00 93",
    ]);
  });
});

describe("L2-014 belt frames", () => {
  it("encodes B0 activate/start and B0 stop", () => {
    expect(toHex(activation())).toBe("F0 B0 01 01 A2");
    expect(toHex(beltStop())).toBe("F0 B0 01 00 A1");
  });

  it("encodes the standard start sequence", () => {
    expect(hexes(beltStart("standard"))).toEqual(["F0 B0 01 01 A2", "F0 D0 01 00 C1", "F0 D0 01 11 D2"]);
  });

  it("encodes the Stride 4 start sequence", () => {
    expect(hexes(beltStart("stride4"))).toEqual(["F0 B0 01 01 A2", "F0 D0 01 00 C1", "F0 D0 01 11 D2", "F0 A5 00 95", "F0 D3 02 01 F4 BA"]);
  });
});

describe("L2-014 A0 keepalive", () => {
  it("encodes counters 1 and 255", () => {
    expect(toHex(keepalive(1))).toBe("F0 A0 01 01 92");
    expect(toHex(keepalive(255))).toBe("F0 A0 01 FF 90");
  });

  it.each([0, 256, 1.5])("refuses counter %s", (n) => {
    expect(() => keepalive(n)).toThrow(RangeError);
  });
});

describe("L2-014 B2 target speed", () => {
  it.each([
    [3.0, "F0 B2 02 0B B8 67"],
    [1.5, "F0 B2 02 05 DC 85"],
    [0, "F0 B2 02 00 00 A4"],
    [0.1, "F0 B2 02 00 64 08"],
  ])("encodes %s km/h", (kmh, hex) => {
    expect(toHex(targetSpeed(kmh))).toBe(hex);
  });

  it.each([3.0001, 3.1, -0.1, Number.NaN, Number.POSITIVE_INFINITY])("refuses %s km/h, above the 3 km/h cap or invalid", (kmh) => {
    expect(() => targetSpeed(kmh)).toThrow(RangeError);
  });
});

describe("L2-014 B1 target incline", () => {
  it.each([
    [0, "F0 B1 01 00 A2"],
    [5, "F0 B1 01 05 A7"],
    [15, "F0 B1 01 0F B1"],
  ])("encodes incline %i", (level, hex) => {
    expect(toHex(targetIncline(level))).toBe(hex);
  });

  it.each([16, -1, 2.5])("refuses incline %s", (level) => {
    expect(() => targetIncline(level)).toThrow(RangeError);
  });
});

describe("L2-014 E0 unlock response", () => {
  it("encodes auth 57 as BCD", () => {
    expect(toHex(unlockResponse(57))).toBe("F0 E0 00 00 57 00 00 27");
  });

  it("encodes auth 0", () => {
    expect(toHex(unlockResponse(0))).toBe("F0 E0 00 00 00 00 00 D0");
  });

  it("puts the tens digit in the high nibble", () => {
    expect(bcd(99)).toBe(0x99);
    expect(bcd(9)).toBe(0x09);
  });

  it.each([100, -1, 2.5])("refuses BCD of %s", (value) => {
    expect(() => bcd(value)).toThrow(RangeError);
  });
});
