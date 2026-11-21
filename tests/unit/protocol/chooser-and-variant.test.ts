// Traces to: L2-006, L2-007, L2-008
import { describe, expect, it } from "vitest";
import { chooserOptions } from "../../../src/protocol/chooser-filters.ts";
import { detectVariant, displayName, isBikeName, variantLabel } from "../../../src/protocol/variant.ts";

const SERVICE = "0bf669f1-45f2-11e7-9598-0800200c9a66";

describe("L2-006 chooser filters", () => {
  it("filters by the three Stride prefixes and the Echelon service", () => {
    expect(chooserOptions().filters).toEqual([
      { namePrefix: "STRIDE" },
      { namePrefix: "Stride" },
      { namePrefix: "stride" },
      { services: [SERVICE] },
    ]);
  });

  it("excludes ECH names and asks for the Echelon service", () => {
    const options = chooserOptions();
    expect(options.exclusionFilters).toEqual([{ namePrefix: "ECH" }, { namePrefix: "Ech" }, { namePrefix: "ech" }]);
    expect(options.optionalServices).toEqual([SERVICE]);
  });
});

describe("L2-007 bike rejection", () => {
  it.each(["ECH-SPORT-1234", "echBike", "Echelon"])("rejects %s", (name) => {
    expect(isBikeName(name)).toBe(true);
  });

  it.each(["STRIDE-8S", "stride4x", "", undefined])("accepts %s", (name) => {
    expect(isBikeName(name)).toBe(false);
  });
});

describe("L2-008 model variant", () => {
  it.each([
    ["STRIDE4-ABC", "stride4"],
    ["stride4x", "stride4"],
    ["STRIDE-8S", "standard"],
    [undefined, "standard"],
  ] as const)("%s is %s", (name, variant) => {
    expect(detectVariant(name)).toBe(variant);
  });

  it("labels the variants as the log writes them", () => {
    expect(variantLabel("stride4")).toBe("Stride 4");
    expect(variantLabel("standard")).toBe("standard");
  });

  it("shows an unnamed device as (unnamed device)", () => {
    expect(displayName(undefined)).toBe("(unnamed device)");
    expect(displayName("")).toBe("(unnamed device)");
    expect(displayName("STRIDE-8S")).toBe("STRIDE-8S");
  });
});
