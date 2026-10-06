import { eventSchema, type HistoricalEvent } from "./types";
import { rankEvent } from "./ranking";
export function normalizeEvent(input: unknown): HistoricalEvent {
  const event = eventSchema.parse(input);
  const cleaned = {
    ...event,
    people: uniqueBy(
      event.people,
      (entity) => entity.wikidataId ?? entity.name.toLocaleLowerCase("en"),
    ),
    organizations: uniqueBy(
      event.organizations,
      (entity) => entity.wikidataId ?? entity.name.toLocaleLowerCase("en"),
    ),
    locations: uniqueBy(event.locations, (location) =>
      JSON.stringify([
        location.name,
        location.country ?? "",
        location.region ?? "",
      ]).toLocaleLowerCase("en"),
    ),
  };
  return { ...cleaned, importanceScore: rankEvent(cleaned) };
}
function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const keys = new Set<string>();
  return items.filter((item) => {
    const identity = key(item);
    if (keys.has(identity)) return false;
    keys.add(identity);
    return true;
  });
}
export function eventIdentityKey(event: Pick<HistoricalEvent, "startDate" | "title">): string {
  return `${event.startDate}:${event.title
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]/gu, "")}`;
}
export function deduplicate(events: HistoricalEvent[]): HistoricalEvent[] {
  const ids = new Set<string>(),
    slugs = new Set<string>(),
    titles = new Set<string>();
  return events.filter((event) => {
    const key = eventIdentityKey(event);
    if ((event.wikidataId && ids.has(event.wikidataId)) || slugs.has(event.slug) || titles.has(key))
      return false;
    if (event.wikidataId) ids.add(event.wikidataId);
    slugs.add(event.slug);
    titles.add(key);
    return true;
  });
}
