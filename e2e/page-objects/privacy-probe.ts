// What the page asks of the network, stores, and allows under its CSP (L2-001, L2-049..052).
import { createHash } from "node:crypto";
import type { Page, Request } from "@playwright/test";

export class PrivacyProbe {
  private readonly page: Page;
  private readonly seen: string[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  /** Starts recording every request the page makes. Call before opening it. */
  recordRequests(): void {
    this.page.on("request", (request: Request) => { this.seen.push(request.url()); });
  }

  /** Every URL requested, except inline data: URIs, which are not network requests. */
  requests(): string[] {
    return this.seen.filter((url) => !url.startsWith("data:") && !url.startsWith("blob:"));
  }

  /** Blocks every request that is not the page file, as with the network off. */
  async blockNetwork(): Promise<string[]> {
    const blocked: string[] = [];
    await this.page.context().route("**/*", async (route) => {
      if (route.request().url().startsWith("file:")) await route.continue();
      else {
        blocked.push(route.request().url());
        await route.abort("internetdisconnected");
      }
    });
    await this.page.context().setOffline(true);
    return blocked;
  }

  /** The CSP meta beside the policy recomputed from the page's own inline script and style. */
  async policies(): Promise<{ declared: string; recomputed: string }> {
    const { declared, script, style } = await this.page.evaluate(() => ({
      declared: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute("content") ?? "",
      script: document.querySelector("script")?.textContent ?? "",
      style: document.querySelector("style")?.textContent ?? "",
    }));
    const hash = (text: string): string => createHash("sha256").update(text, "utf8").digest("base64");
    const recomputed = `default-src 'none'; script-src 'sha256-${hash(script)}'; style-src 'sha256-${hash(style)}'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'`;
    return { declared, recomputed };
  }

  /** Tries a fetch from inside the page; reports the CSP violation and the rejection. */
  async tryFetch(url: string): Promise<{ violatedDirective: string | null; rejected: boolean }> {
    await this.page.clock.resume();
    return this.page.evaluate(async (target) => {
      let violatedDirective: string | null = null;
      document.addEventListener("securitypolicyviolation", (event) => { violatedDirective = event.effectiveDirective; }, { once: true });
      let rejected = false;
      try {
        await window.fetch(target);
      } catch {
        rejected = true;
      }
      await new Promise((resolve) => { setTimeout(resolve, 50); });
      return { violatedDirective, rejected };
    }, url);
  }

  /** Elements carrying an inline style or an on* handler attribute. */
  async inlineAttributes(): Promise<string[]> {
    return this.page.evaluate(() =>
      [...document.querySelectorAll("*")].flatMap((el) =>
        [...el.attributes].filter((a) => a.name === "style" || a.name.startsWith("on")).map((a) => `${el.tagName.toLowerCase()}[${a.name}]`),
      ),
    );
  }

  /** What the page left in browser storage. */
  async storage(): Promise<{ local: number; session: number; indexedDb: number; caches: number; cookie: string }> {
    await this.page.clock.resume();
    return this.page.evaluate(async () => ({
      local: window.localStorage.length,
      session: window.sessionStorage.length,
      indexedDb: (await window.indexedDB.databases()).length,
      caches: "caches" in window ? (await window.caches.keys()).length : 0,
      cookie: document.cookie,
    }));
  }

  /** Font faces and whether the page's own styles applied. */
  async rendering(): Promise<{ loadedFamilies: string[]; failedFamilies: string[]; stylesApplied: boolean }> {
    return this.page.evaluate(async () => {
      await document.fonts.ready;
      const faces = [...document.fonts];
      const button = document.getElementById("connect");
      return {
        loadedFamilies: faces.filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")),
        failedFamilies: faces.filter((f) => f.status === "error").map((f) => f.family),
        stylesApplied: button !== null && getComputedStyle(button).borderRadius !== "0px",
      };
    });
  }
}
