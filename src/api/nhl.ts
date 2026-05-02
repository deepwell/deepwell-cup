import { getNhlApiBase } from "../config";
import type {
  NormalizedPlayoffState,
  ResolvedSeries,
} from "../domain/types";
import {
  conferenceForTeam,
  normalizeAbbr,
} from "../domain/teamConference";

const NHL_GAME_WIN_THRESHOLD = 4;

export class NhlApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "NhlApiError";
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new NhlApiError(`NHL API ${res.status}: ${res.statusText}`, res.status);
  }
  return res.json() as Promise<unknown>;
}

/** Spring calendar year used by `/playoff-bracket/{year}` */
export function bracketYearFromSeasonId(seasonId: string): number {
  if (seasonId.length >= 8) {
    const endYear = Number(seasonId.slice(4, 8));
    if (!Number.isNaN(endYear)) return endYear;
  }
  return new Date().getFullYear();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function abbrevFromTeamNode(team: unknown): string | null {
  const t = asRecord(team);
  if (!t) return null;
  const abbr =
    t.abbrev ??
    t.teamAbbrev ??
    t.abbreviation ??
    (asRecord(t.team)?.abbrev);
  if (typeof abbr === "string") return normalizeAbbr(abbr);
  if (typeof abbr === "object" && abbr && "default" in (abbr as object)) {
    const d = (abbr as { default?: unknown }).default;
    if (typeof d === "string") return normalizeAbbr(d);
  }
  return null;
}

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return 0;
}

function inferConferenceFromTitle(title: string): "Eastern" | "Western" | undefined {
  const t = title.toLowerCase();
  if (t.includes("western")) return "Western";
  if (t.includes("eastern")) return "Eastern";
  return undefined;
}

function parseSeriesEntry(
  seriesObj: Record<string, unknown>,
  roundNumber: number,
): ResolvedSeries | null {
  const letterRaw =
    seriesObj.seriesLetter ??
    seriesObj.seriesCode ??
    seriesObj.seriesAbbrev ??
    "";
  const letter = String(letterRaw).toLowerCase().trim();
  if (!letter) return null;

  /** Playoff carousel uses `topSeed` / `bottomSeed`; other feeds use `homeTeam` / `awayTeam`. */
  const away = seriesObj.awayTeam ?? seriesObj.bottomSeed;
  const home = seriesObj.homeTeam ?? seriesObj.topSeed;
  const awayAbbrev = abbrevFromTeamNode(away);
  const homeAbbrev = abbrevFromTeamNode(home);

  const awayWins = num(asRecord(away)?.wins ?? asRecord(away)?.seriesWins);
  const homeWins = num(asRecord(home)?.wins ?? asRecord(home)?.seriesWins);

  const winningTeamIdRaw = seriesObj.winningTeamId;
  const winningTeamId =
    typeof winningTeamIdRaw === "number" ? winningTeamIdRaw : NaN;

  const title =
    typeof seriesObj.seriesTitle === "string"
      ? seriesObj.seriesTitle
      : typeof seriesObj.seriesName === "string"
        ? seriesObj.seriesName
        : "";

  let conference = inferConferenceFromTitle(title);
  if (!conference && roundNumber === 3 && awayAbbrev && homeAbbrev) {
    const ca = conferenceForTeam(awayAbbrev);
    const cb = conferenceForTeam(homeAbbrev);
    if (ca && cb && ca === cb) conference = ca;
  }

  const statusRaw = seriesObj.seriesStatus;
  const statusStr =
    typeof statusRaw === "string" ? statusRaw.toUpperCase() : "";
  const statusNum = typeof statusRaw === "number" ? statusRaw : NaN;

  const namedWinner =
    typeof seriesObj.winningTeamAbbrev === "string"
      ? normalizeAbbr(seriesObj.winningTeamAbbrev)
      : abbrevFromTeamNode(seriesObj.winningTeam);

  let winnerAbbrev: string | null = namedWinner;
  let gamesPlayed: number | null = null;

  const decidedByWins =
    awayWins >= NHL_GAME_WIN_THRESHOLD || homeWins >= NHL_GAME_WIN_THRESHOLD;

  const decidedByStatus =
    statusStr.includes("COMPLETE") ||
    statusStr.includes("FINAL") ||
    statusNum === 3 ||
    statusNum === 4;

  const sumWins = awayWins + homeWins;
  if (sumWins > 0) {
    gamesPlayed = sumWins;
  }

  function abbrevForTeamId(id: number): string | null {
    const ar = asRecord(away);
    const hr = asRecord(home);
    if (ar && num(ar.id) === id) return abbrevFromTeamNode(away);
    if (hr && num(hr.id) === id) return abbrevFromTeamNode(home);
    return null;
  }

  if (
    !winnerAbbrev &&
    !Number.isNaN(winningTeamId) &&
    winningTeamId > 0
  ) {
    winnerAbbrev = abbrevForTeamId(winningTeamId);
  }

  if (awayAbbrev && homeAbbrev && (decidedByWins || decidedByStatus)) {
    if (!winnerAbbrev) {
      if (awayWins !== homeWins) {
        winnerAbbrev = awayWins > homeWins ? awayAbbrev : homeAbbrev;
      }
    }
    if (gamesPlayed != null && gamesPlayed <= 0) gamesPlayed = null;
  }

  return {
    seriesLetter: letter,
    roundNumber,
    homeAbbrev,
    awayAbbrev,
    winnerAbbrev,
    gamesPlayed,
    conference,
  };
}

function collectSeriesFromRoundLike(
  roundObj: Record<string, unknown>,
): { roundNumber: number; seriesList: unknown[] } | null {
  const rn =
    num(roundObj.roundNumber) ||
    num(roundObj.round) ||
    num(roundObj.roundIdx);
  const seriesRaw =
    roundObj.series ??
    roundObj.seriesList ??
    roundObj.matchupSummaries ??
    roundObj.matchups;
  if (!Array.isArray(seriesRaw)) return null;
  const roundNumber = rn > 0 ? rn : 1;
  return { roundNumber, seriesList: seriesRaw };
}

function flattenCarousel(payload: unknown): ResolvedSeries[] {
  const root = asRecord(payload);
  if (!root) return [];

  const containers: unknown[] = [];

  for (const key of ["rounds", "playoffRounds", "playoffSeriesCarousel"]) {
    const arr = root[key];
    if (Array.isArray(arr)) containers.push(...arr);
  }

  if (containers.length === 0 && Array.isArray(payload)) {
    containers.push(...payload);
  }

  const out: ResolvedSeries[] = [];

  for (const item of containers) {
    const roundRec = asRecord(item);
    if (!roundRec) continue;

    const parsedRound = collectSeriesFromRoundLike(roundRec);
    if (parsedRound) {
      const { roundNumber, seriesList } = parsedRound;
      for (const s of seriesList) {
        const sr = asRecord(s);
        if (!sr) continue;
        const parsed = parseSeriesEntry(sr, roundNumber);
        if (parsed) out.push(parsed);
      }
      continue;
    }

    const solo = parseSeriesEntry(roundRec, num(roundRec.roundNumber));
    if (solo) out.push(solo);
  }

  return dedupeSeries(out);
}

function flattenBracket(payload: unknown): ResolvedSeries[] {
  const root = asRecord(payload);
  if (!root) return [];

  const seriesBlock =
    root.series ??
    root.seriesSummaries ??
    root.playoffSeries ??
    root.matchups;

  const candidates: unknown[] = [];
  if (Array.isArray(seriesBlock)) candidates.push(...seriesBlock);
  if (Array.isArray(root.rounds)) {
    for (const r of root.rounds) {
      const rr = asRecord(r);
      const inner = rr?.series ?? rr?.matchups;
      if (Array.isArray(inner)) candidates.push(...inner);
    }
  }

  const out: ResolvedSeries[] = [];
  for (const item of candidates) {
    const sr = asRecord(item);
    if (!sr) continue;
    const rn =
      num(sr.roundNumber) ||
      num(sr.round) ||
      num(asRecord(sr.round)?.number);
    const parsed = parseSeriesEntry(sr, rn > 0 ? rn : 1);
    if (parsed) out.push(parsed);
  }

  return dedupeSeries(out);
}

function dedupeSeries(list: ResolvedSeries[]): ResolvedSeries[] {
  const map = new Map<string, ResolvedSeries>();
  for (const s of list) {
    const key = `${s.roundNumber}:${s.seriesLetter}`;
    map.set(key, s);
  }
  return [...map.values()].sort((a, b) =>
    a.roundNumber !== b.roundNumber
      ? a.roundNumber - b.roundNumber
      : a.seriesLetter.localeCompare(b.seriesLetter),
  );
}

function mergeSeries(
  primary: ResolvedSeries[],
  secondary: ResolvedSeries[],
): ResolvedSeries[] {
  const map = new Map<string, ResolvedSeries>();
  for (const s of [...primary, ...secondary]) {
    const key = `${s.roundNumber}:${s.seriesLetter}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, s);
      continue;
    }
    map.set(key, {
      ...prev,
      ...s,
      winnerAbbrev: s.winnerAbbrev ?? prev.winnerAbbrev,
      gamesPlayed: s.gamesPlayed ?? prev.gamesPlayed,
      homeAbbrev: s.homeAbbrev ?? prev.homeAbbrev,
      awayAbbrev: s.awayAbbrev ?? prev.awayAbbrev,
      conference: s.conference ?? prev.conference,
    });
  }
  return [...map.values()].sort((a, b) =>
    a.roundNumber !== b.roundNumber
      ? a.roundNumber - b.roundNumber
      : a.seriesLetter.localeCompare(b.seriesLetter),
  );
}

function resolveCupWinner(series: ResolvedSeries[]): string | null {
  const finals = series.filter((s) => s.roundNumber === 4);
  const decided = finals.find((s) => s.winnerAbbrev && s.gamesPlayed);
  return decided?.winnerAbbrev ?? null;
}

function resolveConferenceChampionsFromSeries(
  series: ResolvedSeries[],
): { east: string | null; west: string | null } {
  const r3 = series.filter((s) => s.roundNumber === 3);
  const decided = r3.filter((s) => s.winnerAbbrev);

  const byConf = {
    Eastern: null as string | null,
    Western: null as string | null,
  };

  for (const s of decided) {
    if (s.conference === "Eastern") byConf.Eastern = s.winnerAbbrev;
    if (s.conference === "Western") byConf.Western = s.winnerAbbrev;
  }

  if (!byConf.Eastern || !byConf.Western) {
    const unlabeled = decided.filter((s) => !s.conference);
    for (const s of unlabeled) {
      const w = s.winnerAbbrev;
      if (!w) continue;
      const conf = conferenceForTeam(w);
      if (conf === "Eastern" && !byConf.Eastern) byConf.Eastern = w;
      if (conf === "Western" && !byConf.Western) byConf.Western = w;
    }
  }

  return { east: byConf.Eastern, west: byConf.Western };
}

export async function fetchNormalizedPlayoffState(
  seasonId: string,
): Promise<NormalizedPlayoffState> {
  const base = getNhlApiBase();
  const carouselUrl = `${base}/playoff-series/carousel/${seasonId}/`;
  const year = bracketYearFromSeasonId(seasonId);
  const bracketUrl = `${base}/playoff-bracket/${year}`;

  const [carouselRaw, bracketRaw] = await Promise.all([
    fetchJson(carouselUrl).catch(() => null),
    fetchJson(bracketUrl).catch(() => null),
  ]);

  const fromCarousel = carouselRaw ? flattenCarousel(carouselRaw) : [];
  const fromBracket = bracketRaw ? flattenBracket(bracketRaw) : [];
  const merged = mergeSeries(fromCarousel, fromBracket);

  const cupWinnerAbbrev = resolveCupWinner(merged);
  const { east: easternConferenceChampionAbbrev, west: westernConferenceChampionAbbrev } =
    resolveConferenceChampionsFromSeries(merged);

  return {
    seasonId,
    fetchedAt: new Date().toISOString(),
    series: merged,
    cupWinnerAbbrev,
    easternConferenceChampionAbbrev,
    westernConferenceChampionAbbrev,
  };
}
