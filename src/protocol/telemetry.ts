// Speed, incline and heart rate from inbound frames (L2-028..031). Each field is
// decoded on its own, so one D1 can carry both speed and heart rate.
import type { ParsedFrame } from "./frame-parser.ts";
import type { ModelVariant } from "./variant.ts";

export interface TelemetryUpdate {
  readonly speedKmh?: number;
  readonly incline?: number;
  readonly heartRateBpm?: number;
}

/** Big-endian; callers have checked the length. */
const view = (bytes: Uint8Array): DataView => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

export function decodeTelemetry(frame: ParsedFrame, variant: ModelVariant): TelemetryUpdate {
  const { bytes } = frame;
  if (frame.malformed) return {};
  switch (frame.kind) {
    case "D3":
      return { speedKmh: view(bytes).getUint16(3) / 1000 };
    case "D2":
      return { incline: view(bytes).getUint8(3) };
    case "D1": {
      const update: { speedKmh?: number; heartRateBpm?: number } = {};
      if (variant === "stride4" && bytes.length >= 9) update.speedKmh = view(bytes).getUint16(7) / 100;
      const heartRate = bytes[11];
      if (heartRate !== undefined && heartRate > 0) update.heartRateBpm = heartRate;
      return update;
    }
    default:
      return {};
  }
}
