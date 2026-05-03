import { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
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
import { normalizeAbbr } from "./domain/teamConference";

type ThemeMode = "dark" | "light";

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
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });

  const rounds = useMemo(() => {
    const ids = predictions.participants.flatMap((p) =>
      p.rounds.map((r) => r.round),
    );
    return uniqueRounds(ids);
  }, []);

  const [selectedRound, setSelectedRound] = useState<PlayoffRoundId>(
    rounds[0] ?? "round1",
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState(
    () => new Set<string>(),
  );

  const [playoffState, setPlayoffState] = useState<NormalizedPlayoffState | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

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

  const eliminatedTeams = useMemo(() => {
    const teams = new Set<string>();
    if (!playoffState) return teams;
    for (const s of playoffState.series) {
      if (!s.winnerAbbrev || !s.homeAbbrev || !s.awayAbbrev) continue;
      const winner = normalizeAbbr(s.winnerAbbrev);
      const eliminated =
        normalizeAbbr(s.homeAbbrev) === winner ? s.awayAbbrev : s.homeAbbrev;
      teams.add(normalizeAbbr(eliminated));
    }
    return teams;
  }, [playoffState]);

  const visibleParticipants = useMemo(() => {
    if (selectedParticipantIds.size === 0) return predictions.participants;
    return predictions.participants.filter((p) =>
      selectedParticipantIds.has(p.id),
    );
  }, [selectedParticipantIds]);

  function toggleParticipant(participantId: string) {
    setSelectedParticipantIds((current) => {
      const next = new Set(current);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-top">
          <h1>NHL Playoff Picks</h1>
          <button
            type="button"
            className="theme-toggle"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" size={18} strokeWidth={2.25} />
            ) : (
              <Moon aria-hidden="true" size={18} strokeWidth={2.25} />
            )}
          </button>
        </div>
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
          <StandingsChart
            scores={scores}
            selectedParticipantIds={selectedParticipantIds}
            onToggleParticipant={toggleParticipant}
          />
          <RoundTabs
            rounds={rounds}
            selected={selectedRound}
            onSelect={setSelectedRound}
          />
          <PicksPanel
            participants={visibleParticipants}
            round={selectedRound}
            seriesResults={seriesResults}
            eliminatedTeams={eliminatedTeams}
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
