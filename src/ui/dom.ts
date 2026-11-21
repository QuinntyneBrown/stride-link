// The only way UI code finds elements and writes text: text nodes, never HTML (L2-051).

export function byId<T extends HTMLElement>(root: Document, id: string, type: new () => T): T {
  const element = root.getElementById(id);
  if (!(element instanceof type)) throw new Error(`Missing element #${id}.`);
  return element;
}

export function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}
