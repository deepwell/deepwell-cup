import type {
  Participant,
  PlayoffRoundId,
  ResolvedSeries,
} from "../domain/types";
import { matchupPairKey } from "../domain/matchupKey";
import { normalizeAbbr } from "../domain/teamConference";
import { PLAYOFF_ROUND_LABEL } from "../uiConstants";

interface Props {
  participants: Participant[];
  round: PlayoffRoundId;
  seriesResults: Map<string, ResolvedSeries>;
  eliminatedTeams: Set<string>;
}

function matchupTeams(teamA: string, teamB: string): [string, string] {
  const [x, y] = [normalizeAbbr(teamA), normalizeAbbr(teamB)].sort((a, b) =>
    a.localeCompare(b),
  );
  return [x, y];
}

function TeamAbbr({
  team,
  eliminatedTeams,
}: {
  team: string;
  eliminatedTeams: Set<string>;
}) {
  const normalized = normalizeAbbr(team);
  return (
    <span className={eliminatedTeams.has(normalized) ? "team-eliminated" : ""}>
      {normalized}
    </span>
  );
}

export function PicksPanel({
  participants,
  round,
  seriesResults,
  eliminatedTeams,
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
                    East:{" "}
                    <strong>
                      <TeamAbbr
                        team={p.easternConferenceChampion}
                        eliminatedTeams={eliminatedTeams}
                      />
                    </strong>
                  </li>
                  <li>
                    West:{" "}
                    <strong>
                      <TeamAbbr
                        team={p.westernConferenceChampion}
                        eliminatedTeams={eliminatedTeams}
                      />
                    </strong>
                  </li>
                  <li>
                    Cup:{" "}
                    <strong>
                      <TeamAbbr
                        team={p.stanleyCupChampion}
                        eliminatedTeams={eliminatedTeams}
                      />
                    </strong>
                  </li>
                </ul>
              </header>
              {picks.length === 0 ? (
                <p className="muted">No picks recorded for this round.</p>
              ) : (
                <ul className="pick-list">
                  {picks.map((s) => {
                    const mk = matchupPairKey(
                      roundNum,
                      s.matchupTeams[0],
                      s.matchupTeams[1],
                    );
                    const res = seriesResults.get(mk);
                    const [teamA, teamB] = matchupTeams(
                      s.matchupTeams[0],
                      s.matchupTeams[1],
                    );
                    return (
                      <li key={`${p.id}-${mk}`}>
                        <span className="series-id">
                          <TeamAbbr
                            team={teamA}
                            eliminatedTeams={eliminatedTeams}
                          />{" "}
                          vs{" "}
                          <TeamAbbr
                            team={teamB}
                            eliminatedTeams={eliminatedTeams}
                          />
                        </span>
                        <span>
                          <TeamAbbr
                            team={s.winnerTeamAbbr}
                            eliminatedTeams={eliminatedTeams}
                          />{" "}
                          in {s.gamesPredicted}
                        </span>
                        <span className="muted small">
                          Actual:{" "}
                          {res?.winnerAbbrev && res.gamesPlayed ? (
                            <>
                              <TeamAbbr
                                team={res.winnerAbbrev}
                                eliminatedTeams={eliminatedTeams}
                              />{" "}
                              in {res.gamesPlayed}
                            </>
                          ) : (
                            "pending"
                          )}
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
