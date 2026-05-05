import {
  type NormalizedPlayoffState,
  type Participant,
  type ParticipantScore,
  type ResolvedSeries,
  type ScoreSegment,
  type SeriesPick,
  roundIdToNumber,
} from "./types";
import { normalizeAbbr } from "./teamConference";
import { deepestRoundReached } from "./playoffDerived";
import { matchupPairKey } from "./matchupKey";

function seriesScorePoints(correctTeam: boolean, c: number, p: number): number {
  if (correctTeam) {
    return 15 - 2 * Math.abs(c - p);
  }
  return c + p - 8;
}

export interface SeriesPointsBreakdown {
  points: number;
  /** Lines shown in the matchup tooltip (plain text). */
  lines: string[];
}

/**
 * Explains series score for a decided matchup (same rules as {@link scoreParticipant}).
 */
export function seriesPointsBreakdown(
  pick: SeriesPick,
  resolved: ResolvedSeries,
): SeriesPointsBreakdown | null {
  if (
    !resolved.winnerAbbrev ||
    resolved.gamesPlayed == null ||
    resolved.gamesPlayed <= 0
  ) {
    return null;
  }

  const c = resolved.gamesPlayed;
  const p = pick.gamesPredicted;
  const picked = normalizeAbbr(pick.winnerTeamAbbr);
  const actual = normalizeAbbr(resolved.winnerAbbrev);
  const correct = picked === actual;
  const pts = seriesScorePoints(correct, c, p);

  const lines: string[] = [`Series points: ${pts}`];
  lines.push(`Games played (C): ${c} · You predicted (P): ${p}`);
  if (correct) {
    const gap = Math.abs(c - p);
    lines.push(
      `Winner: correct (${picked}). Formula: 15 − 2×|C − P| = 15 − 2×${gap} = ${pts}`,
    );
  } else {
    lines.push(
      `Winner: wrong (picked ${picked}, actual ${actual}). Formula: C + P − 8 = ${c} + ${p} − 8 = ${pts}`,
    );
  }

  return { points: pts, lines };
}

function roundLabel(round: number): string {
  switch (round) {
    case 1:
      return "First round";
    case 2:
      return "Second round";
    case 3:
      return "Conference finals";
    case 4:
      return "Stanley Cup Final";
    default:
      return `Round ${round}`;
  }
}

function championshipCurve(deepestRound: number): number {
  if (deepestRound <= 1) return 0;
  return 2 * (deepestRound - 1);
}

export function scoreParticipant(
  participant: Participant,
  state: NormalizedPlayoffState,
): ParticipantScore {
  const segments: ScoreSegment[] = [];

  const seriesByMatchup = new Map<string, (typeof state.series)[number]>();
  for (const s of state.series) {
    if (s.homeAbbrev && s.awayAbbrev) {
      const mk = matchupPairKey(s.roundNumber, s.homeAbbrev, s.awayAbbrev);
      seriesByMatchup.set(mk, s);
    }
  }

  for (const rp of participant.rounds) {
    const rn = roundIdToNumber(rp.round);
    for (const pick of rp.series) {
      const mk = matchupPairKey(
        rn,
        pick.matchupTeams[0],
        pick.matchupTeams[1],
      );
      const resolved = seriesByMatchup.get(mk);
      const [x, y] = [
        normalizeAbbr(pick.matchupTeams[0]),
        normalizeAbbr(pick.matchupTeams[1]),
      ].sort((a, b) => a.localeCompare(b));
      const labelBase = `${roundLabel(rn)} · ${x} vs ${y}`;

      if (
        !resolved?.winnerAbbrev ||
        resolved.gamesPlayed == null ||
        resolved.gamesPlayed <= 0
      ) {
        segments.push({
          kind: "series",
          round: rn,
          points: 0,
          label: `${labelBase} (pending)`,
        });
        continue;
      }

      const correct =
        normalizeAbbr(resolved.winnerAbbrev) ===
        normalizeAbbr(pick.winnerTeamAbbr);

      const pts = seriesScorePoints(
        correct,
        resolved.gamesPlayed,
        pick.gamesPredicted,
      );

      segments.push({
        kind: "series",
        round: rn,
        points: pts,
        label: `${labelBase} (${correct ? "winner" : "wrong team"})`,
      });
    }
  }

  const eastDepth = deepestRoundReached(
    participant.easternConferenceChampion,
    state.series,
  );
  const eastPts = championshipCurve(eastDepth);
  segments.push({
    kind: "east",
    points: eastPts,
    label: `East pick depth (R=${eastDepth})`,
  });

  const westDepth = deepestRoundReached(
    participant.westernConferenceChampion,
    state.series,
  );
  const westPts = championshipCurve(westDepth);
  segments.push({
    kind: "west",
    points: westPts,
    label: `West pick depth (R=${westDepth})`,
  });

  const cupDepth = deepestRoundReached(
    participant.stanleyCupChampion,
    state.series,
  );
  const cupPts = championshipCurve(cupDepth);
  segments.push({
    kind: "cup",
    points: cupPts,
    label: `Stanley Cup pick depth (R=${cupDepth})`,
  });

  const totalPoints = segments.reduce((sum, s) => sum + s.points, 0);

  return {
    participantId: participant.id,
    displayName: participant.displayName,
    totalPoints,
    segments,
  };
}

export function scoreAllParticipants(
  participants: Participant[],
  state: NormalizedPlayoffState,
): ParticipantScore[] {
  return participants.map((p) => scoreParticipant(p, state));
}
