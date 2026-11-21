// Traces to: L2-028, L2-029, L2-030, L2-031, L2-069
import { describe, expect, it } from "vitest";
import { parseFrame } from "../../../src/protocol/frame-parser.ts";
import { decodeTelemetry } from "../../../src/protocol/telemetry.ts";
import { bytes } from "./hex-input.ts";

const decode = (hex: string, variant: "standard" | "stride4" = "standard") => decodeTelemetry(parseFrame(bytes(hex)), variant);
const D1 = "F0 D1 00 00 00 00 00 01 2C 00 00 48";

describe("L2-028 D3 speed", () => {
  it("F0 D3 02 0B B8 88 is 3.000 km/h", () => {
    expect(decode("F0 D3 02 0B B8 88")).toEqual({ speedKmh: 3 });
  });

  it("F0 D3 02 00 00 C5 is 0 km/h", () => {
    expect(decode("F0 D3 02 00 00 C5")).toEqual({ speedKmh: 0 });
  });

  it("a 4-byte D3 gives no update", () => {
    expect(decode("F0 D3 02 0B")).toEqual({});
  });

  it("decodes speed whatever the checksum", () => {
    expect(decode("F0 D3 02 05 DC 00")).toEqual({ speedKmh: 1.5 });
  });
});

describe("L2-029 Stride 4 D1 speed and L2-031 D1 heart rate", () => {
  it("Stride 4: speed 3.00 km/h and heart rate 72 from one D1", () => {
    expect(decode(D1, "stride4")).toEqual({ speedKmh: 3, heartRateBpm: 72 });
  });

  it("standard: heart rate only", () => {
    expect(decode(D1, "standard")).toEqual({ heartRateBpm: 72 });
  });

  it("a 12-byte D1 with byte 11 = 00 gives no heart rate", () => {
    expect(decode("F0 D1 00 00 00 00 00 01 2C 00 00 00", "standard")).toEqual({});
  });

  it("an 11-byte D1 gives no heart rate", () => {
    expect(decode("F0 D1 00 00 00 00 00 01 2C 00 00", "stride4")).toEqual({ speedKmh: 3 });
  });

  it("a Stride 4 D1 under 9 bytes gives nothing", () => {
    expect(decode("F0 D1 00 00 00 00 00 01", "stride4")).toEqual({});
  });
});

describe("L2-030 D2 incline", () => {
  it("F0 D2 01 05 C8 is incline 5", () => {
    expect(decode("F0 D2 01 05 C8")).toEqual({ incline: 5 });
  });

  it("a 3-byte D2 gives no update", () => {
    expect(decode("F0 D2 01")).toEqual({});
  });
});

describe("frames without telemetry", () => {
  it.each(["F0 D0 01 07 C8", "F0 E0 34 12 05 78 97 2A", "F0 A4 00 94", "", "A0 D3 02 0B B8 88"])("%s gives no update", (hex) => {
    expect(decode(hex)).toEqual({});
  });
});
