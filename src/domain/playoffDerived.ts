import type { ResolvedSeries } from "./types";
import { normalizeAbbr } from "./teamConference";

const MAX_ROUND = 4;

/**
 * Highest playoff round number (1–4) that `teamAbbr` has reached.
 *
 * A team that *won* a series in round N has advanced to round N+1, so they
 * receive credit for that next round even before the API exposes those
 * matchups. Round 4 (the Stanley Cup Final) is the ceiling.
 */
export function deepestRoundReached(
  teamAbbr: string,
  series: ResolvedSeries[],
): number {
  const want = normalizeAbbr(teamAbbr);
  let max = 0;
  for (const s of series) {
    const sides = [s.homeAbbrev, s.awayAbbrev].filter(Boolean) as string[];
    if (!sides.some((a) => normalizeAbbr(a) === want)) continue;

    const won = s.winnerAbbrev && normalizeAbbr(s.winnerAbbrev) === want;
    const depth = won
      ? Math.min(s.roundNumber + 1, MAX_ROUND)
      : s.roundNumber;
    max = Math.max(max, depth);
  }
  return max;
}
