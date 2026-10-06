import type { Category, HistoricalEvent } from "./types";
export type EventFilters = {
  region: string;
  category: Category | "ALL";
  country: string;
  query: string;
};
export function filterEvents(events: HistoricalEvent[], filters: EventFilters): HistoricalEvent[] {
  const query = filters.query.trim().toLocaleLowerCase("en");
  return events
    .filter(
      (event) =>
        (filters.region === "World" ||
          event.locations.some((location) => location.region === filters.region)) &&
        (filters.category === "ALL" || event.category === filters.category) &&
        (!filters.country ||
          event.locations.some((location) => location.country === filters.country)) &&
        [
          event.title,
          event.shortDescription,
          ...event.locations.flatMap((location) => [
            location.name,
            location.city,
            location.country,
            location.region,
          ]),
          ...event.people.map((person) => person.name),
          ...event.organizations.map((organization) => organization.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("en")
          .includes(query),
    )
    .sort((a, b) => b.importanceScore - a.importanceScore || a.title.localeCompare(b.title, "en"));
}
