// Frame hex used across acceptance specs, so specs read as the L2 text does.
export const F = {
  A4: "F0 A4 00 94",
  A1: "F0 A1 00 91",
  A3: "F0 A3 00 93",
  STRIDE4_E0: "F0 E0 FD 3E 65 48 D5 8D",
  D3_ZERO: "F0 D3 02 00 00 C5",
  D3_3KMH: "F0 D3 02 0B B8 88",
  D2_5: "F0 D2 01 05 C8",
  D0: "F0 D0 01 07 C8",
  D1: "F0 D1 00 00 00 00 00 01 2C 00 00 48",
  CHALLENGE: "F0 E0 34 12 05 78 97 2A",
  RESPONSE_57: "F0 E0 00 00 57 00 00 27",
  ACK_57: "F0 E0 00 00 57 00 00 27",
  ACTIVATION: "F0 B0 01 01 A2",
  STOP: "F0 B0 01 00 A1",
} as const;

export const STANDARD_INIT = [F.A4, F.A1, F.A1, F.A1, F.A1, F.A3, F.A1];
export const STRIDE4_INIT = [F.A4, F.A4, F.STRIDE4_E0, F.A4, F.A1, F.A1, F.A1, F.A1, F.A3];
