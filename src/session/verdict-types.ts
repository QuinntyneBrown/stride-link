// The four verdicts (L1 terms).

export type Verdict = "silent" | "talks" | "unlocked" | "locked";

export interface VerdictRecord {
  readonly verdict: Verdict;
  readonly reason?: string;
}

export const verdictWord: Record<Verdict, string> = {
  silent: "Silent",
  talks: "Talks",
  unlocked: "Unlocked",
  locked: "Locked",
};
