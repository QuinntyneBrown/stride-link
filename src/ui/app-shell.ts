// Binds the static page to the session state.
import type { BuildInfo } from "../build-info.ts";
import type { RunController } from "../session/run-controller.ts";
import { statusMessages } from "./messages/connection-messages.ts";
import { byId, setText } from "./dom.ts";

export class AppShell {
  private readonly doc: Document;
  private readonly controller: RunController;

  constructor(doc: Document, controller: RunController) {
    this.doc = doc;
    this.controller = controller;
  }

  mount(build: BuildInfo): void {
    setText(byId(this.doc, "build-version", HTMLElement), `v${build.version}`);
    setText(byId(this.doc, "build-commit", HTMLElement), build.commit);
    const statusText = byId(this.doc, "status-text", HTMLElement);
    const connect = byId(this.doc, "connect", HTMLButtonElement);
    this.controller.state.subscribe((state) => {
      setText(statusText, statusMessages[state.status]);
      connect.disabled = !state.connectEnabled;
    });
  }
}
