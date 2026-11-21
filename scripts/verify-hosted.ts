// Checks a deployed hosted copy against L2-053: npm run verify:hosted -- <https url> <sha256 file>
// Run by the release workflow once a static host is configured; never by tests.
import { readFileSync } from "node:fs";
import { hashFromSha256sum, hostedProblems } from "./hosted.ts";

async function main(): Promise<void> {
  const [url, hashFile] = process.argv.slice(2);
  if (!url?.startsWith("https://") || !hashFile) throw new Error("Usage: verify-hosted <https url> <sha256 file>");
  const plain = await fetch(url.replace(/^https:/, "http:"), { redirect: "manual" });
  const secure = await fetch(url);
  const headers: Record<string, string> = {};
  secure.headers.forEach((value, name) => { headers[name] = value; });
  const problems = hostedProblems(
    {
      httpStatus: plain.status,
      httpLocation: plain.headers.get("location"),
      headers,
      body: new Uint8Array(await secure.arrayBuffer()),
    },
    hashFromSha256sum(readFileSync(hashFile, "utf8")),
  );
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) process.exitCode = 1;
  else console.log(`${url} meets L2-053.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
