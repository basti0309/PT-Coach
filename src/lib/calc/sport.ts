// Sportarten-Kategorien der App und Zuordnung der Strava-Sportarten.

export const SPORTS = [
  "laufen",
  "radfahren",
  "schwimmen",
  "rudern",
  "gehen",
  "wandern",
  "skilanglauf",
  "sonstiges",
] as const;

export type Sport = (typeof SPORTS)[number];

export const SPORT_LABELS: Record<Sport, string> = {
  laufen: "Laufen",
  radfahren: "Radfahren",
  schwimmen: "Schwimmen",
  rudern: "Rudern",
  gehen: "Gehen",
  wandern: "Wandern",
  skilanglauf: "Skilanglauf",
  sonstiges: "Sonstiges",
};

/**
 * Strava `sport_type` → Kategorie. Nicht aufgeführte Strava-Sportarten
 * werden nie einer geplanten Einheit zugeordnet (→ ungeplante Einheit, Kategorie "sonstiges").
 */
export const STRAVA_SPORT_MAP: Readonly<Record<string, Exclude<Sport, "sonstiges">>> = {
  Run: "laufen",
  TrailRun: "laufen",
  VirtualRun: "laufen",
  Ride: "radfahren",
  MountainBikeRide: "radfahren",
  GravelRide: "radfahren",
  EBikeRide: "radfahren",
  EMountainBikeRide: "radfahren",
  VirtualRide: "radfahren",
  Velomobile: "radfahren",
  Swim: "schwimmen",
  Rowing: "rudern",
  VirtualRow: "rudern",
  Walk: "gehen",
  Hike: "wandern",
  NordicSki: "skilanglauf",
};

export function mapStravaSport(sportType: string): Sport {
  return STRAVA_SPORT_MAP[sportType] ?? "sonstiges";
}
