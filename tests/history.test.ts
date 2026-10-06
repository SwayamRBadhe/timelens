import { describe, expect, it, vi } from "vitest";
import { formatDate, normalizeDate, shiftDate } from "../lib/history/dates";
import { deduplicate, normalizeEvent } from "../lib/history/normalize";
import { rankEvent } from "../lib/history/ranking";
import { seedEvents } from "../lib/history/seed-data";
import { occursOn } from "../lib/history/types";
import { SeedProvider } from "../lib/history/providers/seed";
import {
  WikidataProvider,
  buildDateQuery,
  normalizeWikidata,
} from "../lib/history/providers/wikidata";
import { fetchWithFallback } from "../lib/history/providers/fallback";

describe("Gregorian day boundaries", () => {
  it.each(["1500-01-01", "1969-07-20", "2000-02-29", "9999-12-31"])("preserves %s", (date) =>
    expect(normalizeDate(date)).toBe(date),
  );
  it.each([
    "1499-12-31",
    "1900-02-29",
    "2001-02-29",
    "2000-13-01",
    "2000-04-31",
    "1969-7-20",
    "1969-07-20T00:00:00Z",
    'x" } UNION {',
  ])("rejects %s", (date) => expect(() => normalizeDate(date)).toThrow());
  it("navigates leap days and year boundaries without timezone conversion", () => {
    expect(shiftDate("2000-03-01", -1)).toBe("2000-02-29");
    expect(shiftDate("1999-12-31", 1)).toBe("2000-01-01");
    expect(shiftDate("1500-01-01", -1)).toBeNull();
    expect(shiftDate("9999-12-31", 1)).toBeNull();
    expect(formatDate("1969-07-20", "EEEE")).toBe("Sunday");
  });
});
describe("event validation and ranking", () => {
  const sample = seedEvents[0];
  it("rejects impossible ranges and unsafe links", () => {
    expect(() => normalizeEvent({ ...sample, endDate: "1969-07-19" })).toThrow();
    expect(() => normalizeEvent({ ...sample, sourceUrl: "javascript:alert(1)" })).toThrow();
  });
  it("has deterministic bounded scores that reward source completeness", () => {
    expect(rankEvent(sample)).toBe(rankEvent(sample));
    expect(rankEvent(sample)).toBeLessThanOrEqual(100);
    expect(
      rankEvent({
        ...sample,
        wikipediaUrl: undefined,
        locations: [],
        people: [],
        organizations: [],
      }),
    ).toBeLessThan(rankEvent(sample));
  });
  it("deduplicates by Wikidata ID, slug, and date/title", () => {
    expect(
      deduplicate([
        sample,
        { ...sample, slug: "different" },
        { ...sample, slug: "another", title: sample.title.toUpperCase() },
      ]),
    ).toHaveLength(1);
    expect(
      deduplicate([
        { ...sample, wikidataId: "Q1" },
        { ...sample, slug: "unique", title: "Different title", wikidataId: "Q1" },
      ]),
    ).toHaveLength(1);
  });
  it("does not put year-precision data on an exact date", () =>
    expect(occursOn({ ...sample, datePrecision: "YEAR" }, sample.startDate)).toBe(false));
  it("includes ongoing context only inside its inclusive range", () => {
    const war = seedEvents.find((e) => e.slug === "nigerian-civil-war")!;
    expect(occursOn(war, "1969-07-20")).toBe(true);
    expect(occursOn(war, "1970-01-16")).toBe(false);
  });
});
describe("providers", () => {
  it.each(["1969-07-20", "1989-11-09", "2001-09-11", "1947-08-15", "2000-01-01"])(
    "has several sourced fallback records on %s",
    async (date) => {
      const events = await new SeedProvider().fetchEventsForDate(date);
      expect(events.length).toBeGreaterThanOrEqual(3);
      expect(events.every((e) => e.sourceUrl && e.sourceName.startsWith("TimeLens seed"))).toBe(
        true,
      );
    },
  );
  it("uses seeds when the primary provider fails", async () => {
    const result = await fetchWithFallback(
      "1969-07-20",
      {
        name: "broken",
        fetchEventsForDate: async () => {
          throw new Error("secret connection info");
        },
      },
      new SeedProvider(),
    );
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.error).not.toContain("secret");
  });
  it("retains seeds when the provider has zero results", async () => {
    const result = await fetchWithFallback(
      "1969-07-20",
      { name: "empty", fetchEventsForDate: async () => [] },
      new SeedProvider(),
    );
    expect(result.error).toBeUndefined();
    expect(result.events).toHaveLength(3);
  });
  it("merges successful provider data without duplicates", async () => {
    const primary = { name: "test", fetchEventsForDate: async () => [seedEvents[0]] };
    expect(
      (await fetchWithFallback("1969-07-20", primary, new SeedProvider())).events,
    ).toHaveLength(3);
  });
  it("requires Gregorian day precision and bounds query size", () => {
    const query = buildDateQuery("1969-07-20");
    expect(query).toContain("timePrecision 11");
    expect(query).toContain("Q1985727");
    expect(query).toContain("LIMIT 35");
    expect(() => buildDateQuery('1969-07-20"')).toThrow();
  });
  it("validates upstream JSON and merges locations without invented regions", () => {
    expect(() => normalizeWikidata({}, "1969-07-20")).toThrow();
    const row = {
      item: { value: "http://www.wikidata.org/entity/Q123" },
      itemLabel: { value: "Test event" },
      itemDescription: { value: "An event description" },
      placeLabel: { value: "Paris" },
      countryLabel: { value: "France" },
    };
    const events = normalizeWikidata(
      { results: { bindings: [row, { ...row, placeLabel: { value: "London" } }] } },
      "1969-07-20",
    );
    expect(events).toHaveLength(1);
    expect(events[0].locations).toHaveLength(2);
    expect(events[0].locations[0].region).toBeUndefined();
  });
  it("retries a transient response once", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("down", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ results: { bindings: [] } }));
    expect(await new WikidataProvider(request).fetchEventsForDate("1969-07-20")).toEqual([]);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not retry a rate-limited endpoint", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("limited", { status: 429 }));
    await expect(new WikidataProvider(request).fetchEventsForDate("1969-07-20")).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
