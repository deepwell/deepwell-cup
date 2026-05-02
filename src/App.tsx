import { useEffect, useMemo, useState } from "react";
import { fetchNormalizedPlayoffState, NhlApiError } from "./api/nhl";
import { PicksPanel } from "./components/PicksPanel";
import { RoundTabs } from "./components/RoundTabs";
import { StandingsChart } from "./components/StandingsChart";
import { PLAYOFF_SEASON_ID } from "./config";
import { predictions } from "./data/loadPredictions";
import type {
  NormalizedPlayoffState,
  PlayoffRoundId,
  ResolvedSeries,
} from "./domain/types";
import { matchupPairKey } from "./domain/matchupKey";
import { scoreAllParticipants } from "./domain/scoring";

function uniqueRounds(ids: PlayoffRoundId[]): PlayoffRoundId[] {
  return Array.from(new Set(ids)).sort((a, b) => {
    const order: PlayoffRoundId[] = [
      "round1",
      "round2",
      "round3",
      "round4",
    ];
    return order.indexOf(a) - order.indexOf(b);
  });
}

export default function App() {
  const seasonId = predictions.seasonId ?? PLAYOFF_SEASON_ID;

  const rounds = useMemo(() => {
    const ids = predictions.participants.flatMap((p) =>
      p.rounds.map((r) => r.round),
    );
    return uniqueRounds(ids);
  }, []);

  const [selectedRound, setSelectedRound] = useState<PlayoffRoundId>(
    rounds[0] ?? "round1",
  );

  const [playoffState, setPlayoffState] = useState<NormalizedPlayoffState | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const s = await fetchNormalizedPlayoffState(seasonId);
        if (!cancelled) {
          setPlayoffState(s);
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof NhlApiError
              ? `${e.message}`
              : e instanceof Error
                ? e.message
                : String(e);
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seasonId]);

  const scores = useMemo(() => {
    if (!playoffState) return [];
    return scoreAllParticipants(predictions.participants, playoffState).sort(
      (a, b) => b.totalPoints - a.totalPoints,
    );
  }, [playoffState]);

  const seriesResults = useMemo(() => {
    const m = new Map<string, ResolvedSeries>();
    if (!playoffState) return m;
    for (const s of playoffState.series) {
      if (s.homeAbbrev && s.awayAbbrev) {
        m.set(
          matchupPairKey(s.roundNumber, s.homeAbbrev, s.awayAbbrev),
          s,
        );
      }
    }
    return m;
  }, [playoffState]);

  return (
    <div className="app">
      <header className="hero">
        <h1>NHL Playoff Picks</h1>
        <p className="muted">
          Static picks from{" "}
          <code>src/data/predictions.json</code> · Live results from{" "}
          <code>api-web.nhle.com</code> · Season <strong>{seasonId}</strong>
        </p>
        {loading && <p className="status loading">Loading playoff data…</p>}
        {error && (
          <p className="status error" role="alert">
            Could not load NHL data: {error}. Try setting{" "}
            <code>VITE_NHL_API_BASE=/nhle/v1</code> for the dev proxy, or check
            your network.
          </p>
        )}
        {playoffState && (
          <p className="muted small">
            Last fetch: {new Date(playoffState.fetchedAt).toLocaleString()} ·{" "}
            {playoffState.series.length} series rows parsed
          </p>
        )}
      </header>

      {playoffState && (
        <>
          <StandingsChart scores={scores} />
          <RoundTabs
            rounds={rounds}
            selected={selectedRound}
            onSelect={setSelectedRound}
          />
          <PicksPanel
            participants={predictions.participants}
            round={selectedRound}
            seriesResults={seriesResults}
          />
        </>
      )}

      {!playoffState && !loading && (
        <p className="muted">
          Standings and picks appear once playoff data loads successfully.
        </p>
      )}
    </div>
  );
}
