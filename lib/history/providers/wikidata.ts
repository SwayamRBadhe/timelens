import { z } from "zod";
import { normalizeDate } from "../dates";
import { normalizeEvent } from "../normalize";
import type { Category, HistoricalEvent } from "../types";
import type { HistoryProvider } from "./types";
import { HistoryProviderError } from "./errors";

const value = z.object({ value: z.string() });
const binding = z.object({
  item: value,
  itemLabel: value,
  itemDescription: value.optional(),
  article: value.optional(),
  place: value.optional(),
  placeLabel: value.optional(),
  countryLabel: value.optional(),
  kind: value.optional(),
});
const responseSchema = z.object({ results: z.object({ bindings: z.array(binding).max(200) }) });
const categoryByClass: Record<string, Category> = {
  Q40231: "POLITICS",
  Q178561: "WAR_CONFLICT",
  Q16510064: "SPORTS",
  Q5916: "SPACE",
  Q3839081: "DISASTER",
  Q198: "WAR_CONFLICT",
};
export function buildDateQuery(date: string) {
  normalizeDate(date); // Prevent user input ever becoming SPARQL syntax.
  return `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX hint: <http://www.bigdata.com/queryHints#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?item ?itemLabel ?itemDescription ?article ?place ?placeLabel ?countryLabel ?kind WHERE {
 { SELECT DISTINCT ?item WHERE {
   hint:Query hint:optimizer "None".
   ?time wikibase:timeValue "${date}T00:00:00Z"^^xsd:dateTime;
         wikibase:timePrecision 11; wikibase:timeCalendarModel wd:Q1985727.
   { ?statement psv:P585 ?time. ?item p:P585 ?statement. }
   UNION { ?statement psv:P580 ?time. ?item p:P580 ?statement. }
   ?item wdt:P31/wdt:P279* wd:Q1656682. hint:Prior hint:gearing "forward".
 } LIMIT 35 }
 OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>. }
 OPTIONAL { ?item wdt:P276 ?place. OPTIONAL { ?place wdt:P17 ?country. } }
 OPTIONAL { ?item wdt:P31 ?kind. }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 200`;
}
export function normalizeWikidata(payload: unknown, date: string): HistoricalEvent[] {
  normalizeDate(date);
  const rows = responseSchema.parse(payload).results.bindings;
  const events = new Map<string, HistoricalEvent>();
  for (const row of rows) {
    const id = row.item.value.match(/\/entity\/(Q\d+)$/)?.[1];
    if (!id || row.itemLabel.value === id || !row.itemDescription?.value) continue;
    const placeName = row.placeLabel?.value;
    const countryName = row.countryLabel?.value;
    const locations =
      placeName && !/^Q\d+$/.test(placeName)
        ? [
            {
              name: placeName,
              ...(countryName && !/^Q\d+$/.test(countryName) ? { country: countryName } : {}),
            },
          ]
        : [];
    const category = categoryByClass[row.kind?.value.split("/").pop() ?? ""] ?? "OTHER";
    const existing = events.get(id);
    if (existing) {
      for (const location of locations)
        if (
          !existing.locations.some(
            (l) => l.name === location.name && l.country === location.country,
          )
        )
          existing.locations.push(location);
      if (existing.category === "OTHER") existing.category = category;
      continue;
    }
    const candidate = {
      slug: `wikidata-${id.toLowerCase()}`,
      title: row.itemLabel.value,
      shortDescription: row.itemDescription.value,
      fullDescription:
        "Wikidata records this Gregorian day as a point in time or the start of this event. This entry does not imply the event ended on the same day. Follow the source for its complete chronology.",
      startDate: date,
      category,
      wikidataId: id,
      wikipediaUrl: row.article?.value,
      sourceName: "Wikidata",
      sourceUrl: `https://www.wikidata.org/wiki/${id}`,
      locations,
    };
    try {
      events.set(id, normalizeEvent(candidate));
    } catch {
      /* A malformed record does not invalidate unrelated records. */
    }
  }
  return [...events.values()].map(normalizeEvent);
}
export class WikidataProvider implements HistoryProvider {
  readonly name = "Wikidata";
  constructor(private readonly request: typeof fetch = fetch) {}
  async fetchEventsForDate(date: string) {
    const url = new URL("https://query.wikidata.org/sparql");
    url.searchParams.set("query", buildDateQuery(date));
    url.searchParams.set("format", "json");
    for (let attempt = 0; attempt < 2; attempt++) {
      const signal = AbortSignal.timeout(6500);
      try {
        const response = await this.request(url, {
          headers: {
            Accept: "application/sparql-results+json",
            "User-Agent": "TimeLens/0.1 (historical-date exploration; bounded interactive queries)",
          },
          signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new HistoryProviderError("http", response.status);
        }
        try {
          return normalizeWikidata(await response.json(), date);
        } catch (error) {
          if (signal.aborted) throw new HistoryProviderError("timeout");
          if (error instanceof z.ZodError || error instanceof SyntaxError)
            throw new HistoryProviderError("invalid-response");
          throw error;
        }
      } catch (error) {
        const timedOut =
          signal.aborted || (error instanceof Error && error.name === "TimeoutError");
        const failure =
          error instanceof HistoryProviderError
            ? error
            : new HistoryProviderError(timedOut ? "timeout" : "network");
        // Rate limits/client errors and malformed responses are not transient. A timeout
        // should cool down in PostgreSQL rather than immediately repeat an expensive query.
        const retryable =
          failure.failure === "network" ||
          (failure.failure === "http" && (failure.status ?? 0) >= 500);
        if (attempt === 1 || !retryable) throw failure;
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
    return [];
  }
}
