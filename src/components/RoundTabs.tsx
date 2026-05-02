import type { PlayoffRoundId } from "../domain/types";
import { roundIdToNumber } from "../domain/types";
import { PLAYOFF_ROUND_LABEL } from "../uiConstants";

interface Props {
  rounds: PlayoffRoundId[];
  selected: PlayoffRoundId;
  onSelect: (r: PlayoffRoundId) => void;
}

export function RoundTabs({ rounds, selected, onSelect }: Props) {
  const sorted = [...rounds].sort(
    (a, b) => roundIdToNumber(a) - roundIdToNumber(b),
  );

  return (
    <div className="tabs" role="tablist" aria-label="Playoff round">
      {sorted.map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={selected === r}
          className={`tab ${selected === r ? "tab-active" : ""}`}
          onClick={() => onSelect(r)}
        >
          {PLAYOFF_ROUND_LABEL[r]}
        </button>
      ))}
    </div>
  );
}
