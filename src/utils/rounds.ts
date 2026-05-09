import type { Participant, PlayoffRoundId } from "../domain/types";

const ROUND_ORDER: PlayoffRoundId[] = ["round1", "round2", "round3", "round4"];

export function uniqueRounds(ids: PlayoffRoundId[]): PlayoffRoundId[] {
  return Array.from(new Set(ids)).sort(
    (a, b) => ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b),
  );
}

/** Latest playoff round (by bracket order) that has at least one series pick. */
export function latestRoundWithPicks(
  participants: Participant[],
  tabRounds: PlayoffRoundId[],
): PlayoffRoundId {
  const withPicks = uniqueRounds(
    participants.flatMap((p) =>
      p.rounds
        .filter((r) => r.series.length > 0)
        .map((r) => r.round),
    ),
  );
  if (withPicks.length > 0) {
    return withPicks[withPicks.length - 1]!;
  }
  return tabRounds[0] ?? "round1";
}
