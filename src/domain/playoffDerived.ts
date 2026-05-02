import type { ResolvedSeries } from "./types";
import { normalizeAbbr } from "./teamConference";

/** Highest playoff round number (1–4) in which `teamAbbr` appears in any series. */
export function deepestRoundReached(
  teamAbbr: string,
  series: ResolvedSeries[],
): number {
  const want = normalizeAbbr(teamAbbr);
  let max = 0;
  for (const s of series) {
    const sides = [s.homeAbbrev, s.awayAbbrev].filter(Boolean) as string[];
    if (sides.some((a) => normalizeAbbr(a) === want)) {
      max = Math.max(max, s.roundNumber);
    }
  }
  return max;
}
