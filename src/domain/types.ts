/** Tab key / JSON round id */
export type PlayoffRoundId = "round1" | "round2" | "round3" | "round4";

export interface SeriesPick {
  /** Lowercase series letter used by NHL URLs (`a` … `p`) */
  seriesLetter: string;
  winnerTeamAbbr: string;
  /** Predicted length of the series in games (4–7) */
  gamesPredicted: number;
}

export interface RoundPicks {
  round: PlayoffRoundId;
  series: SeriesPick[];
}

export interface Participant {
  id: string;
  displayName: string;
  easternConferenceChampion: string;
  westernConferenceChampion: string;
  stanleyCupChampion: string;
  rounds: RoundPicks[];
}

export interface PredictionsFile {
  seasonId: string;
  participants: Participant[];
}

/** One playoff series after normalization from NHL payloads */
export interface ResolvedSeries {
  seriesLetter: string;
  roundNumber: number;
  homeAbbrev: string | null;
  awayAbbrev: string | null;
  winnerAbbrev: string | null;
  /** Total games played when the series is decided */
  gamesPlayed: number | null;
  /** Present when the API labels the conference */
  conference?: "Eastern" | "Western";
}

export interface NormalizedPlayoffState {
  seasonId: string;
  fetchedAt: string;
  series: ResolvedSeries[];
  cupWinnerAbbrev: string | null;
  easternConferenceChampionAbbrev: string | null;
  westernConferenceChampionAbbrev: string | null;
}

export type ScoreSegmentKind = "series" | "east" | "west" | "cup";

export interface ScoreSegment {
  kind: ScoreSegmentKind;
  /** For kind === "series": playoff round number 1–4 */
  round?: number;
  points: number;
  label: string;
}

export interface ParticipantScore {
  participantId: string;
  displayName: string;
  totalPoints: number;
  segments: ScoreSegment[];
}

export function roundIdToNumber(id: PlayoffRoundId): number {
  switch (id) {
    case "round1":
      return 1;
    case "round2":
      return 2;
    case "round3":
      return 3;
    case "round4":
      return 4;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function roundNumberToId(n: number): PlayoffRoundId | null {
  if (n === 1) return "round1";
  if (n === 2) return "round2";
  if (n === 3) return "round3";
  if (n === 4) return "round4";
  return null;
}
