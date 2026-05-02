import type { ScoreSegment } from "../domain/types";

export function segmentCssVar(segment: ScoreSegment): string {
  switch (segment.kind) {
    case "east":
      return "var(--seg-east)";
    case "west":
      return "var(--seg-west)";
    case "cup":
      return "var(--seg-cup)";
    case "series":
      switch (segment.round) {
        case 1:
          return "var(--seg-r1)";
        case 2:
          return "var(--seg-r2)";
        case 3:
          return "var(--seg-r3)";
        case 4:
          return "var(--seg-r4)";
        default:
          return "var(--seg-muted)";
      }
    default:
      return "var(--seg-muted)";
  }
}
