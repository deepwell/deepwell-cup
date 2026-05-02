import {
  type NormalizedPlayoffState,
  type Participant,
  type ParticipantScore,
  type ScoreSegment,
  roundIdToNumber,
} from "./types";
import { normalizeAbbr } from "./teamConference";
import { deepestRoundReached } from "./playoffDerived";

function seriesScorePoints(correctTeam: boolean, c: number, p: number): number {
  if (correctTeam) {
    return 15 - 2 * Math.abs(c - p);
  }
  return c + p - 8;
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

  const seriesIndex = new Map<string, (typeof state.series)[number]>();
  for (const s of state.series) {
    seriesIndex.set(`${s.roundNumber}:${s.seriesLetter.toLowerCase()}`, s);
  }

  for (const rp of participant.rounds) {
    const rn = roundIdToNumber(rp.round);
    for (const pick of rp.series) {
      const key = `${rn}:${pick.seriesLetter.toLowerCase()}`;
      const resolved = seriesIndex.get(key);
      const labelBase = `${roundLabel(rn)} · Series ${pick.seriesLetter.toUpperCase()}`;

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
