import type { HistoricalEvent } from "./types";
// A completeness/discoverability heuristic, NOT an objective historical importance metric.
export function rankEvent(event: HistoricalEvent): number {
  return Math.min(
    100,
    20 +
      (event.wikipediaUrl ? 20 : 0) +
      (event.sourceUrl ? 10 : 0) +
      (event.fullDescription ? 10 : 0) +
      (event.locations.length ? 10 : 0) +
      Math.min(10, event.people.length * 5) +
      Math.min(10, event.organizations.length * 5) +
      (new Set(event.locations.map((l) => l.region).filter(Boolean)).size > 1 ? 5 : 0) +
      (event.category !== "OTHER" ? 5 : 0),
  );
}
