// Saves text through a Blob and an object URL; nothing goes over the network (L2-040).

export function downloadText(doc: Document, fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  doc.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Revoke once the download has started.
    window.setTimeout(() => { URL.revokeObjectURL(url); }, 0);
  }
}
