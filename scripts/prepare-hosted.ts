// Stages the release: release/ gets stride-link.html and its sha256sum file
// (L2-059); hosted/ gets the page and a _headers file for the static host (L2-053).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { headersFile, sha256sumLine } from "./hosted.ts";

const page = readFileSync("dist/stride-link.html");
for (const dir of ["release", "hosted"]) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir);
}
writeFileSync("release/stride-link.html", page);
writeFileSync("release/stride-link.html.sha256", sha256sumLine(page));
writeFileSync("hosted/stride-link.html", page);
writeFileSync("hosted/_headers", headersFile(page.toString("utf8")));
console.log(`release/ and hosted/ staged; ${sha256sumLine(page).trim()}`);
