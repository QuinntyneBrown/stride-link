// Traces to: L2-020, L2-021, L2-022, L2-023, L2-024, L2-069
import { describe, expect, it } from "vitest";
import { unlockResponse } from "../../../src/protocol/frame-encoder.ts";
import { toHex } from "../../../src/protocol/hex.ts";
import { isAcknowledgement, leadingDecimal, solveChallenge, validateAuth } from "../../../src/protocol/unlock.ts";
import { bytes } from "./hex-input.ts";

describe("L2-021 unlock arithmetic", () => {
  it("valid challenge: a = 534, b = 1278, c = 97, auth = 57 and response F0 E0 00 00 57 00 00 27", () => {
    const result = solveChallenge(bytes("F0 E0 34 12 05 78 97 2A"));
    expect(result).toEqual({ ok: true, values: { a: 534, b: 1278, c: 97, auth: 57 } });
    if (result.ok) expect(toHex(unlockResponse(result.values.auth))).toBe("F0 E0 00 00 57 00 00 27");
  });

  it("auth 0: a = 3010, b = 2040, c = 50 and response F0 E0 00 00 00 00 00 D0", () => {
    const result = solveChallenge(bytes("F0 E0 10 20 30 40 50 C0"));
    expect(result).toEqual({ ok: true, values: { a: 3010, b: 2040, c: 50, auth: 0 } });
    if (result.ok) expect(toHex(unlockResponse(result.values.auth))).toBe("F0 E0 00 00 00 00 00 D0");
  });

  it("reads the leading decimal run of a digit string", () => {
    expect(leadingDecimal("0534")).toBe(534);
    expect(leadingDecimal("3A34")).toBe(3);
    expect(leadingDecimal("9A")).toBe(9);
    expect(leadingDecimal("A534")).toBeNull();
  });

  it("b4 = 3A and b2 = 34 give a = 3", () => {
    // a = 3, b = 1278 (b3 12, b5 78), c = 97: auth = 3834 mod 97 = 51
    const result = solveChallenge(bytes("F0 E0 34 12 3A 78 97 5F"));
    expect(result).toEqual({ ok: true, values: { a: 3, b: 1278, c: 97, auth: 3834 % 97 } });
  });

  it("b6 = 9A gives c = 9", () => {
    const result = solveChallenge(bytes("F0 E0 34 12 05 78 9A 2D"));
    expect(result.ok && result.values.c).toBe(9);
  });
});

describe("L2-022 invalid challenges", () => {
  it("zero divisor", () => {
    expect(solveChallenge(bytes("F0 E0 34 12 05 78 00 93"))).toEqual({ ok: false, reason: "zero divisor" });
  });

  it("no decimal prefix in a", () => {
    expect(solveChallenge(bytes("F0 E0 34 12 A5 78 97 CA"))).toEqual({ ok: false, reason: "no decimal prefix in a" });
  });

  it("no decimal prefix in b", () => {
    expect(solveChallenge(bytes("F0 E0 34 B2 05 78 97 CA"))).toEqual({ ok: false, reason: "no decimal prefix in b" });
  });

  it("no decimal prefix in c", () => {
    expect(solveChallenge(bytes("F0 E0 34 12 05 78 C7 5A"))).toEqual({ ok: false, reason: "no decimal prefix in c" });
  });

  it("auth out of range is reported by the validator", () => {
    expect(validateAuth(100)).toBe("auth out of range");
    expect(validateAuth(-1)).toBe("auth out of range");
    expect(validateAuth(2.5)).toBe("auth out of range");
    expect(validateAuth(99)).toBeNull();
    expect(validateAuth(0)).toBeNull();
  });
});

describe("L2-020 challenge recognition", () => {
  it("bad checksum", () => {
    expect(solveChallenge(bytes("F0 E0 34 12 05 78 97 2B"))).toEqual({ ok: false, reason: "challenge checksum invalid" });
  });

  it.each([
    ["F0 E0 34 12 05 78 2A", 7],
    ["F0 E0 34 12 05 78 97 00 2A", 9],
  ])("wrong length %s", (hex, length) => {
    expect(solveChallenge(bytes(hex))).toEqual({ ok: false, reason: `challenge length ${length}` });
  });
});

describe("L2-024 acknowledgement", () => {
  it("matching acknowledgement", () => {
    expect(isAcknowledgement(bytes("F0 E0 00 00 57 00 00 27"), 57)).toBe(true);
  });

  it("mismatching acknowledgement", () => {
    expect(isAcknowledgement(bytes("F0 E0 00 00 56 00 00 26"), 57)).toBe(false);
  });

  it.each([
    ["F0 E0 00 00 57 00 00 28", "bad checksum"],
    ["F0 E0 00 00 57 00 27", "short"],
    ["F1 E0 00 00 57 00 00 28", "not F0"],
    ["F0 E1 00 00 57 00 00 28", "not E0"],
  ])("rejects %s (%s)", (hex) => {
    expect(isAcknowledgement(bytes(hex), 57)).toBe(false);
  });
});
