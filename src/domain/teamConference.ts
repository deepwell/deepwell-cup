/** NHL alignment for inference when series metadata lacks conference labels */
export const TEAM_CONFERENCE: Record<string, "Eastern" | "Western"> = {
  ANA: "Western",
  ARI: "Western",
  BOS: "Eastern",
  BUF: "Eastern",
  CAR: "Eastern",
  CBJ: "Eastern",
  CGY: "Western",
  CHI: "Western",
  COL: "Western",
  DAL: "Western",
  DET: "Eastern",
  EDM: "Western",
  FLA: "Eastern",
  LAK: "Western",
  MIN: "Western",
  MTL: "Eastern",
  NSH: "Western",
  NJD: "Eastern",
  NYI: "Eastern",
  NYR: "Eastern",
  OTT: "Eastern",
  PHI: "Eastern",
  PIT: "Eastern",
  SEA: "Western",
  SJS: "Western",
  STL: "Western",
  TBL: "Eastern",
  TOR: "Eastern",
  UTA: "Western",
  VAN: "Western",
  VGK: "Western",
  WPG: "Western",
  WSH: "Eastern",
};

export function conferenceForTeam(abbr: string): "Eastern" | "Western" | undefined {
  return TEAM_CONFERENCE[normalizeAbbr(abbr)];
}

export function normalizeAbbr(abbr: string): string {
  return abbr.trim().toUpperCase();
}
