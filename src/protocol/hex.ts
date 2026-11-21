// The one hex format used on screen and in the export (L2-016).

export function toHex(bytes: Uint8Array | readonly number[]): string {
  let out = "";
  for (const byte of bytes) {
    if (out !== "") out += " ";
    out += (byte & 0xff).toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}
