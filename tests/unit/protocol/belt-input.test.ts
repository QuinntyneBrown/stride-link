// Traces to: L2-046, L2-047, L2-069
import { describe, expect, it } from "vitest";
import { parseIncline, parseSpeed } from "../../../src/protocol/belt-input.ts";
import { targetIncline, targetSpeed } from "../../../src/protocol/frame-encoder.ts";
import { toHex } from "../../../src/protocol/hex.ts";

describe("L2-046 speed input", () => {
  it.each([
    ["1.5", 1.5],
    ["0", 0],
    ["3", 3],
    ["3.0", 3],
    [" 2.2 ", 2.2],
  ])("accepts %s", (raw, kmh) => {
    expect(parseSpeed(raw)).toEqual({ ok: true, kmh });
  });

  it.each(["3.1", "4", "1e3", "Infinity"])("caps %s", (raw) => {
    expect(parseSpeed(raw)).toEqual({ ok: false, error: raw === "Infinity" ? "speed-range" : "speed-cap" });
  });

  it.each(["-1", "", "   ", "abc", "NaN", "-0.1"])("rejects %j", (raw) => {
    expect(parseSpeed(raw)).toEqual({ ok: false, error: "speed-range" });
  });

  it("1.5 km/h encodes as F0 B2 02 05 DC 85 and 3.0 as F0 B2 02 0B B8 67", () => {
    expect(toHex(targetSpeed(1.5))).toBe("F0 B2 02 05 DC 85");
    expect(toHex(targetSpeed(3))).toBe("F0 B2 02 0B B8 67");
  });
});

describe("L2-047 incline input", () => {
  it.each([
    ["5", 5],
    ["0", 0],
    ["15", 15],
  ])("accepts %s", (raw, level) => {
    expect(parseIncline(raw)).toEqual({ ok: true, level });
  });

  it.each(["16", "2.5", "-1", "", "x"])("rejects %j", (raw) => {
    expect(parseIncline(raw)).toEqual({ ok: false, error: "incline-range" });
  });

  it("incline 5 encodes as F0 B1 01 05 A7", () => {
    expect(toHex(targetIncline(5))).toBe("F0 B1 01 05 A7");
  });
});
