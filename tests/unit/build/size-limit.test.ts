// Traces to: L2-001
import { describe, expect, it } from "vitest";
import { SIZE_LIMIT_BYTES, assertUnderSizeLimit } from "../../../scripts/build-checks.ts";

describe("L2-001 build size limit", () => {
  it("accepts a file one byte under 204,800 bytes", () => {
    expect(() => { assertUnderSizeLimit(204_799); }).not.toThrow();
  });

  it("fails at exactly 204,800 bytes and names the actual size", () => {
    expect(SIZE_LIMIT_BYTES).toBe(204_800);
    expect(() => { assertUnderSizeLimit(204_800); }).toThrow("dist/stride-link.html is 204800 bytes");
  });

  it("fails above the limit and names the actual size", () => {
    expect(() => { assertUnderSizeLimit(250_123); }).toThrow("250123 bytes");
  });
});
