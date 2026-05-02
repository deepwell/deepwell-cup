import type { ParticipantScore, ScoreSegment } from "../domain/types";
import { segmentCssVar } from "./colors";

interface Props {
  scores: ParticipantScore[];
}

function visualWeight(points: number): number {
  return Math.max(0, points);
}

function lastVisibleSegmentIndex(segments: ScoreSegment[]): number {
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (visualWeight(segments[i].points) > 0) {
      return i;
    }
  }
  return -1;
}

export function StandingsChart({ scores }: Props) {
  const maxVisual = Math.max(
    1,
    ...scores.map((s) =>
      s.segments.reduce((acc, seg) => acc + visualWeight(seg.points), 0),
    ),
  );

  return (
    <section className="panel standings">
      <h2>Points</h2>
      <p className="muted small">
        Bar segments show contributions by round (series picks) and
        championship picks (East / West / Cup depth bonus). Segment widths use
        positive points only; totals include negatives from the wrong-team
        formula.
      </p>
      <ul className="standings-list">
        {scores.map((row) => {
          const visualSum = row.segments.reduce(
            (acc, seg) => acc + visualWeight(seg.points),
            0,
          );
          const terminalSegmentIndex = lastVisibleSegmentIndex(row.segments);
          const barScale = maxVisual > 0 ? visualSum / maxVisual : 0;
          return (
            <li key={row.participantId} className="standings-row">
              <div className="standings-name">{row.displayName}</div>
              <div className="standings-bar-wrap">
                <div
                  className="standings-bar"
                  style={{
                    width: `${Math.min(100, Math.max(8, barScale * 100))}%`,
                  }}
                  aria-label={`Score bar for ${row.displayName}`}
                >
                  {row.segments.map((seg, idx) => (
                    <StandingsSegment
                      key={`${row.participantId}-${idx}-${seg.label}`}
                      segment={seg}
                      isTerminal={idx === terminalSegmentIndex}
                    />
                  ))}
                </div>
              </div>
              <div
                className={`standings-total ${row.totalPoints < 0 ? "neg" : ""}`}
                title="Total points (includes negatives)"
              >
                {row.totalPoints}
              </div>
            </li>
          );
        })}
      </ul>
      <Legend />
    </section>
  );
}

function StandingsSegment({
  segment,
  isTerminal,
}: {
  segment: ScoreSegment;
  isTerminal: boolean;
}) {
  const w = visualWeight(segment.points);
  return (
    <div
      className={`standings-seg ${isTerminal ? "standings-seg-terminal" : ""}`}
      style={{
        flexGrow: w > 0 ? w : 0,
        flexBasis: 0,
        minWidth: w > 0 ? "4px" : 0,
        background: segmentCssVar(segment),
      }}
      title={`${segment.label}: ${segment.points}`}
      aria-label={`${segment.label} ${segment.points} points`}
    />
  );
}

function Legend() {
  const items: Array<{ label: string; varName: string }> = [
    { label: "Round 1 series", varName: "var(--seg-r1)" },
    { label: "Round 2 series", varName: "var(--seg-r2)" },
    { label: "Round 3 series", varName: "var(--seg-r3)" },
    { label: "Cup Final series", varName: "var(--seg-r4)" },
    { label: "East champion pick", varName: "var(--seg-east)" },
    { label: "West champion pick", varName: "var(--seg-west)" },
    { label: "Stanley Cup pick", varName: "var(--seg-cup)" },
  ];
  return (
    <div className="legend">
      {items.map((item) => (
        <span key={item.label} className="legend-item">
          <span
            className="legend-swatch"
            style={{ background: item.varName }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
