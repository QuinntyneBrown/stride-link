// Model variant and bike detection from the advertised name (L2-007, L2-008).

export type ModelVariant = "standard" | "stride4";

export const UNNAMED_DEVICE = "(unnamed device)";

/** An Echelon bike: any name starting "ech" in any case. */
export function isBikeName(name: string | undefined): boolean {
  return name?.toLowerCase().startsWith("ech") ?? false;
}

export function detectVariant(name: string | undefined): ModelVariant {
  return name?.toLowerCase().startsWith("stride4") ? "stride4" : "standard";
}

export function displayName(name: string | undefined): string {
  return name === undefined || name === "" ? UNNAMED_DEVICE : name;
}

export function variantLabel(variant: ModelVariant): string {
  return variant === "stride4" ? "Stride 4" : "standard";
}
