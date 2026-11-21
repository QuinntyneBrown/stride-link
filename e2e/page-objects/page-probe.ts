// Measures the rendered page: geometry, focus, targets, labels, motion and axe
// audits (L2-060..067). Tests state the expectation; this knows the DOM.
import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import type { Box } from "./stop-bar.ts";

export type Region = "status" | "connection" | "telemetry" | "belt" | "log" | "footer" | "primary" | "stopBar";

const REGION_SELECTORS: Record<Region, string> = {
  status: "#status-panel",
  connection: "#connect-panel",
  telemetry: "#telemetry-panel",
  belt: "#belt-panel",
  log: "#log-panel",
  footer: "footer",
  primary: ".app__primary",
  stopBar: "#stop-bar",
};

export interface FocusRing {
  id: string;
  width: number;
  style: string;
  contrast: number;
}

export interface Target {
  id: string;
  width: number;
  height: number;
}

export interface Labelled {
  id: string;
  name: string;
  visible: string;
}

export interface AxeViolation {
  id: string;
  impact: string;
  targets: string[];
}

export class PageProbe {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  region(name: Region): Locator {
    return this.page.locator(REGION_SELECTORS[name]);
  }

  async box(name: Region): Promise<Box | null> {
    return this.region(name).boundingBox();
  }

  async hasHorizontalScroll(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  }

  async documentHeight(): Promise<number> {
    return this.page.evaluate(() => document.documentElement.scrollHeight);
  }

  /** Serious and critical axe violations against WCAG 2.2 A and AA. */
  async seriousViolations(): Promise<AxeViolation[]> {
    // axe schedules its own timers; let the page clock run for the audit.
    await this.page.clock.resume();
    const results = await new AxeBuilder({ page: this.page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    return results.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({ id: v.id, impact: v.impact ?? "", targets: v.nodes.map((n) => n.target.join(" ")) }));
  }

  /** Every visible element that can take focus by Tab, in DOM order. */
  async tabbableIds(): Promise<string[]> {
    return this.page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")]
        .filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0)
        .map((el) => el.id || el.tagName.toLowerCase()),
    );
  }

  /** Presses Tab from the top until focus returns to the start; returns ids and boxes in order. */
  async tabSequence(maxPresses = 60): Promise<{ id: string; box: Box }[]> {
    await this.page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    // Clicking an inert spot moves the sequential focus starting point to the top.
    await this.page.mouse.click(1, 1);
    const seen: { id: string; box: Box }[] = [];
    for (let i = 0; i < maxPresses; i += 1) {
      await this.page.keyboard.press("Tab");
      const next = await this.page.evaluate(() => {
        const el = document.activeElement;
        if (!(el instanceof HTMLElement) || el === document.body) return null;
        const r = el.getBoundingClientRect();
        return { id: el.id || el.tagName.toLowerCase(), box: { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height } };
      });
      if (next === null || seen.some((s) => s.id === next.id)) break;
      seen.push(next);
    }
    return seen;
  }

  /** Focuses each tabbable element by keyboard and measures its focus ring. */
  async focusRings(): Promise<FocusRing[]> {
    const rings: FocusRing[] = [];
    for (const { id } of await this.tabSequence()) {
      const control = this.page.locator(`#${id}`);
      await control.focus();
      const { width, style } = await control.evaluate((el) => {
        const computed = getComputedStyle(el);
        return { width: parseFloat(computed.outlineWidth), style: computed.outlineStyle };
      });
      rings.push({ id, width, style, contrast: await this.contrast(control, "outlineColor", "parent") });
    }
    return rings;
  }

  /** Bounding boxes of every visible interactive element; a wrapped checkbox is measured with its label. */
  async targets(): Promise<Target[]> {
    return this.page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea")]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { id: el.id || el.tagName.toLowerCase(), width: r.width, height: r.height };
        }),
    );
  }

  /** Each visible control's accessible name beside its visible label text. */
  async labels(): Promise<Labelled[]> {
    const ids = await this.page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("button, input, a[href]")].filter((el) => el.getClientRects().length > 0).map((el) => el.id),
    );
    const result: Labelled[] = [];
    for (const id of ids) {
      const control = this.page.locator(`#${id}`);
      const visible = await control.evaluate((el) => {
        const visibleText = (node: Element): string =>
          [...node.childNodes]
            .map((child) => (child instanceof Element ? (child.getAttribute("aria-hidden") === "true" ? "" : visibleText(child)) : (child.textContent ?? "")))
            .join("");
        const label = el instanceof HTMLInputElement ? el.labels?.[0] : el;
        return visibleText(label ?? el).replace(/\s+/g, " ").trim();
      });
      const name = await control.evaluate((el) => el.getAttribute("aria-label") ?? "");
      result.push({ id, name: name || (await accessibleName(control)), visible });
    }
    return result;
  }

  /** Elements whose computed animation or transition lasts longer than 0 ms. */
  async movingElements(): Promise<string[]> {
    return this.page.evaluate(() => {
      const long = (list: string): boolean => list.split(",").some((d) => parseFloat(d) > 0);
      return [...document.querySelectorAll("*")]
        .filter((el) => {
          const s = getComputedStyle(el);
          return (s.animationName !== "none" && long(s.animationDuration)) || long(s.transitionDuration);
        })
        .map((el) => el.id || el.getAttribute("class") || el.tagName);
    });
  }

  /** Base body text: the body and the paragraphs that use it. */
  async fontSizePx(selector: "body" | "status-text" | "subtitle"): Promise<number> {
    const css = { body: "body", "status-text": "#status-text", subtitle: ".subtitle" }[selector];
    return this.page.locator(css).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  }

  async viewportMeta(): Promise<string | null> {
    return this.page.locator('meta[name="viewport"]').getAttribute("content");
  }

  /** Contrast of an input's or checkbox's border against the background behind it (non-text, 3:1). */
  async boundaryContrast(control: "speed" | "belt-gate"): Promise<number> {
    return this.contrast(this.page.locator(`#${control}`), "borderTopColor", "parent");
  }

  /** Text contrast of an element against its effective background. */
  async textContrast(locator: Locator): Promise<number> {
    return this.contrast(locator, "color", "self");
  }

  /** WCAG contrast of one colour property against the nearest opaque background. */
  private async contrast(locator: Locator, property: "color" | "borderTopColor" | "outlineColor", from: "self" | "parent"): Promise<number> {
    return locator.evaluate(
      (el, [prop, start]) => {
        const parse = (c: string): number[] => (c.match(/[\d.]+/g) ?? []).map(Number);
        const luminance = ([r = 0, g = 0, b = 0]: number[]): number => {
          const lin = (v: number): number => {
            const x = v / 255;
            return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        };
        let bg: number[] = [255, 255, 255];
        for (let node: Element | null = start === "self" ? el : el.parentElement; node; node = node.parentElement) {
          const c = parse(getComputedStyle(node).backgroundColor);
          if (c.length === 3 || (c.length === 4 && (c[3] ?? 0) > 0.5)) {
            bg = c.slice(0, 3);
            break;
          }
        }
        const fg = luminance(parse(getComputedStyle(el)[prop]));
        const back = luminance(bg);
        return (Math.max(fg, back) + 0.05) / (Math.min(fg, back) + 0.05);
      },
      [property, from] as const,
    );
  }
}

async function accessibleName(control: Locator): Promise<string> {
  const snapshot = await control.ariaSnapshot();
  const match = /^- \w+ "(.*?)"/.exec(snapshot);
  return match?.[1] ?? "";
}
