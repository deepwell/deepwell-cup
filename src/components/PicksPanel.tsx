import type {
  Participant,
  PlayoffRoundId,
  ResolvedSeries,
} from "../domain/types";
import { PLAYOFF_ROUND_LABEL } from "../uiConstants";

interface Props {
  participants: Participant[];
  round: PlayoffRoundId;
  seriesResults: Map<string, ResolvedSeries>;
}

function seriesKey(roundNum: number, letter: string): string {
  return `${roundNum}:${letter.toLowerCase()}`;
}

export function PicksPanel({
  participants,
  round,
  seriesResults,
}: Props) {
  const roundNum =
    round === "round1"
      ? 1
      : round === "round2"
        ? 2
        : round === "round3"
          ? 3
          : 4;

  return (
    <section className="panel picks-panel">
      <h2>Picks · {PLAYOFF_ROUND_LABEL[round]}</h2>
      <div className="picks-grid">
        {participants.map((p) => {
          const rp = p.rounds.find((x) => x.round === round);
          const picks = rp?.series ?? [];
          return (
            <article key={p.id} className="pick-card">
              <header className="pick-card-head">
                <h3>{p.displayName}</h3>
                <ul className="champs-inline">
                  <li>
                    East: <strong>{p.easternConferenceChampion}</strong>
                  </li>
                  <li>
                    West: <strong>{p.westernConferenceChampion}</strong>
                  </li>
                  <li>
                    Cup: <strong>{p.stanleyCupChampion}</strong>
                  </li>
                </ul>
              </header>
              {picks.length === 0 ? (
                <p className="muted">No picks recorded for this round.</p>
              ) : (
                <ul className="pick-list">
                  {picks.map((s) => {
                    const res = seriesResults.get(
                      seriesKey(roundNum, s.seriesLetter),
                    );
                    const outcome =
                      res?.winnerAbbrev && res.gamesPlayed
                        ? `${res.winnerAbbrev} in ${res.gamesPlayed}`
                        : "pending";
                    return (
                      <li key={`${p.id}-${s.seriesLetter}`}>
                        <span className="series-id">
                          Series {s.seriesLetter.toUpperCase()}
                        </span>
                        <span>
                          {s.winnerTeamAbbr} in {s.gamesPredicted}
                        </span>
                        <span className="muted small">
                          Actual: {outcome}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
