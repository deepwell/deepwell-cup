import type {
  Participant,
  PlayoffRoundId,
  ResolvedSeries,
  SeriesPick,
} from "../domain/types";
import { matchupPairKey } from "../domain/matchupKey";
import { seriesPointsBreakdown } from "../domain/scoring";
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

function isSeriesDecided(res: ResolvedSeries | undefined): res is ResolvedSeries {
  return Boolean(
    res?.winnerAbbrev &&
      res.gamesPlayed != null &&
      res.gamesPlayed > 0,
  );
}

function ResolvedPickLine({
  pick,
  result,
  eliminatedTeams,
}: {
  pick: SeriesPick;
  result: ResolvedSeries;
  eliminatedTeams: Set<string>;
}) {
  const pickWon =
    normalizeAbbr(pick.winnerTeamAbbr) ===
    normalizeAbbr(result.winnerAbbrev!);
  const gamesOk = pick.gamesPredicted === result.gamesPlayed!;
  const winner = result.winnerAbbrev!;

  if (pickWon && gamesOk) {
    return (
      <span className="pick-mark-correct">
        <TeamAbbr team={pick.winnerTeamAbbr} eliminatedTeams={eliminatedTeams} />{" "}
        in {result.gamesPlayed}
      </span>
    );
  }

  const teamPart = pickWon ? (
    <span className="pick-mark-correct">
      <TeamAbbr team={pick.winnerTeamAbbr} eliminatedTeams={eliminatedTeams} />
    </span>
  ) : (
    <>
      <span className="pick-struck">
        <TeamAbbr team={pick.winnerTeamAbbr} eliminatedTeams={eliminatedTeams} />
      </span>{" "}
      <span className="pick-outcome-plain">
        <TeamAbbr team={winner} eliminatedTeams={eliminatedTeams} />
      </span>
    </>
  );

  const gamesPart = gamesOk ? (
    <span className="pick-mark-correct">{result.gamesPlayed}</span>
  ) : (
    <>
      <span className="pick-struck">{pick.gamesPredicted}</span>{" "}
      <span className="pick-outcome-plain">{result.gamesPlayed}</span>
    </>
  );

  return (
    <>
      {teamPart} in {gamesPart}
    </>
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
                    const decided = isSeriesDecided(res);
                    const breakdown = decided
                      ? seriesPointsBreakdown(s, res)
                      : null;
                    const tooltipId = breakdown
                      ? `${p.id}-${mk}-series-points-tip`
                      : undefined;
                    return (
                      <li key={`${p.id}-${mk}`}>
                        <span
                          className={
                            breakdown
                              ? "series-id series-id--decided"
                              : "series-id"
                          }
                          tabIndex={breakdown ? 0 : undefined}
                          aria-describedby={tooltipId}
                        >
                          <span className="series-id-matchup">
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
                          {breakdown && tooltipId ? (
                            <span
                              id={tooltipId}
                              className="series-points-tooltip"
                              role="tooltip"
                            >
                              {breakdown.lines.map((line, i) => (
                                <span
                                  key={i}
                                  className="series-points-tooltip-line"
                                >
                                  {line}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                        {decided ? (
                          <span className="pick-resolution">
                            <ResolvedPickLine
                              pick={s}
                              result={res}
                              eliminatedTeams={eliminatedTeams}
                            />
                          </span>
                        ) : (
                          <>
                            <span>
                              <TeamAbbr
                                team={s.winnerTeamAbbr}
                                eliminatedTeams={eliminatedTeams}
                              />{" "}
                              in {s.gamesPredicted}
                            </span>
                            <span className="muted small">Pending</span>
                          </>
                        )}
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
