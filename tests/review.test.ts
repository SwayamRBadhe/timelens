import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDate, shiftDate } from "../lib/history/dates";
import { normalizeEvent, deduplicate } from "../lib/history/normalize";
import { filterEvents } from "../lib/history/explore";
import { seedEvents } from "../lib/history/seed-data";
import { SeedProvider } from "../lib/history/providers/seed";
import { WikidataProvider, buildDateQuery } from "../lib/history/providers/wikidata";
import { fetchWithFallback } from "../lib/history/providers/fallback";
import { HistoryProviderError } from "../lib/history/providers/errors";

const originalTimezone = process.env.TZ;
afterEach(() => {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
});

describe("timezone-independent historical days", () => {
  it.each(["UTC", "America/New_York", "Pacific/Apia", "Pacific/Kiritimati", "Asia/Kathmandu"])(
    "preserves the day and weekday in %s",
    (timezone) => {
      process.env.TZ = timezone;
      expect(formatDate("2011-12-30")).toBe("December 30, 2011");
      expect(formatDate("2011-12-30", "EEEE")).toBe("Friday");
      expect(formatDate("1969-07-20")).toBe("July 20, 1969");
      expect(formatDate("1500-01-01", "yyyy")).toBe("1500");
      expect(shiftDate("2011-12-29", 1)).toBe("2011-12-30");
      expect(shiftDate("2011-12-30", 1)).toBe("2011-12-31");
      expect(shiftDate("2024-03-10", 1)).toBe("2024-03-11");
    },
  );
  it.each([0.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid offset %s", (offset) =>
    expect(() => shiftDate("1969-07-20", offset)).toThrow(),
  );
});

describe("normalization consistency", () => {
  it("does not count repeated participants or locations twice in ranking", () => {
    const sample = seedEvents[0];
    const duplicated = normalizeEvent({
      ...sample,
      people: [...sample.people, ...sample.people],
      organizations: [...sample.organizations, ...sample.organizations],
      locations: [...sample.locations, ...sample.locations],
    });
    expect(duplicated.people).toEqual(sample.people);
    expect(duplicated.locations).toEqual(sample.locations);
    expect(duplicated.importanceScore).toBe(sample.importanceScore);
  });
  it("rejects blank entity names and source names", () => {
    expect(() => normalizeEvent({ ...seedEvents[0], sourceName: "   " })).toThrow();
    expect(() => normalizeEvent({ ...seedEvents[0], people: [{ name: "   " }] })).toThrow();
  });
  it("deduplicates canonically equivalent Unicode titles", () => {
    const event = normalizeEvent({ ...seedEvents[0], title: "Café" });
    expect(
      deduplicate([event, { ...event, slug: "different-title-form", title: "Cafe\u0301" }]),
    ).toHaveLength(1);
  });
});

describe("combined exploration filters", () => {
  const defaults = { region: "World", category: "ALL" as const, country: "", query: "" };
  it("searches countries and trims the query", () => {
    const matches = filterEvents(seedEvents, { ...defaults, query: "  Switzerland  " });
    expect(matches.map((event) => event.slug)).toEqual(["1947-geneva-trade-negotiations"]);
  });
  it("combines category, region, and country using AND", () => {
    expect(
      filterEvents(seedEvents, {
        ...defaults,
        region: "Europe",
        category: "SPORTS",
        country: "France",
      }).map((event) => event.slug),
    ).toEqual(["1969-tour-de-france"]);
    expect(filterEvents(seedEvents, { ...defaults, region: "Europe", category: "SPACE" })).toEqual(
      [],
    );
  });
  it("keeps unmapped locations visible in all regions without inventing a region", () => {
    const event = { ...seedEvents[0], locations: [{ name: "Unmapped place" }] };
    expect(filterEvents([event], defaults)).toHaveLength(1);
    expect(filterEvents([event], { ...defaults, region: "Europe" })).toHaveLength(0);
  });
});

describe("bounded and diagnosable external discovery", () => {
  it("starts with the exact date before the event ontology path", () => {
    const query = buildDateQuery("1969-07-20");
    expect(query.indexOf("wikibase:timeValue")).toBeLessThan(query.indexOf("wdt:P31/wdt:P279*"));
    expect(query).toContain('hint:optimizer "None"');
    expect(query).toContain('hint:gearing "forward"');
    expect(query).toContain("LIMIT 35");
  });
  it("does not immediately repeat a timed-out historical query", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException("Network details", "TimeoutError"));
    await expect(
      new WikidataProvider(request).fetchEventsForDate("1969-07-20"),
    ).rejects.toMatchObject({ failure: "timeout" });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("does not retry invalid JSON", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("not json"));
    await expect(
      new WikidataProvider(request).fetchEventsForDate("1969-07-20"),
    ).rejects.toMatchObject({ failure: "invalid-response" });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("keeps safe failure diagnostics during fallback", async () => {
    const result = await fetchWithFallback(
      "1969-07-20",
      {
        name: "Wikidata",
        fetchEventsForDate: async () => {
          throw new HistoryProviderError("http", 429);
        },
      },
      new SeedProvider(),
    );
    expect(result.error).toContain("HTTP 429");
    expect(result.events).toHaveLength(3);
  });
});
