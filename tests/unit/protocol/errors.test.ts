// Traces to: L2-058
import { describe, expect, it } from "vitest";
import { errorFacts } from "../../../src/protocol/errors.ts";

describe("L2-058 error facts", () => {
  it("reads name and message from an Error", () => {
    expect(errorFacts(new TypeError("bad"))).toEqual({ name: "TypeError", message: "bad" });
  });

  it("reads a DOMException-like object", () => {
    expect(errorFacts({ name: "NotFoundError", message: "User cancelled" })).toEqual({ name: "NotFoundError", message: "User cancelled" });
  });

  it("falls back for objects without a usable name or message", () => {
    expect(errorFacts({ name: "", message: 3 })).toEqual({ name: "Error", message: "(no message)" });
  });

  it("stringifies primitives", () => {
    expect(errorFacts("<b>bad</b>")).toEqual({ name: "Error", message: "<b>bad</b>" });
    expect(errorFacts(null)).toEqual({ name: "Error", message: "null" });
  });
});
