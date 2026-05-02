import { normalizeAbbr } from "./teamConference";

/**
 * Stable key for a two-team playoff series in a given round.
 * Order of teams does not matter.
 */
export function matchupPairKey(
  roundNumber: number,
  teamA: string,
  teamB: string,
): string {
  const a = normalizeAbbr(teamA);
  const b = normalizeAbbr(teamB);
  const [x, y] = a <= b ? [a, b] : [b, a];
  return `${roundNumber}:${x}|${y}`;
}
