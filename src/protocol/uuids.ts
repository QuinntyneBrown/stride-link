// Echelon GATT identifiers (Observed, qdomyos-zwift a23bb20).

export const ECHELON_SERVICE = "0bf669f1-45f2-11e7-9598-0800200c9a66";

export const CHARACTERISTICS = {
  f2: "0bf669f2-45f2-11e7-9598-0800200c9a66",
  f3: "0bf669f3-45f2-11e7-9598-0800200c9a66",
  f4: "0bf669f4-45f2-11e7-9598-0800200c9a66",
} as const;

export type CharName = keyof typeof CHARACTERISTICS;
export type NotifyChar = "f3" | "f4";
