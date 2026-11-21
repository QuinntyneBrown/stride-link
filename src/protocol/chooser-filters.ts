// requestDevice() options: Strides by name prefix or Echelon service, bikes excluded (L2-006).
import { ECHELON_SERVICE } from "./uuids.ts";

export interface ChooserOptions {
  readonly filters: readonly ({ readonly namePrefix: string } | { readonly services: readonly string[] })[];
  readonly exclusionFilters: readonly { readonly namePrefix: string }[];
  readonly optionalServices: readonly string[];
}

export function chooserOptions(): ChooserOptions {
  return {
    filters: [{ namePrefix: "STRIDE" }, { namePrefix: "Stride" }, { namePrefix: "stride" }, { services: [ECHELON_SERVICE] }],
    exclusionFilters: [{ namePrefix: "ECH" }, { namePrefix: "Ech" }, { namePrefix: "ech" }],
    optionalServices: [ECHELON_SERVICE],
  };
}
