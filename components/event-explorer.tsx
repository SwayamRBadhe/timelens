"use client";
import { useMemo, useState } from "react";
import { Globe2, Search, SlidersHorizontal, X } from "lucide-react";
import {
  categories,
  categoryLabels,
  regions,
  type Category,
  type HistoricalEvent,
} from "@/lib/history/types";
import { EventCard } from "./event-card";
import { CategoryIcon } from "./category-icon";
import { filterEvents } from "@/lib/history/explore";
export function EventExplorer({
  events,
  showDate = false,
}: {
  events: HistoricalEvent[];
  showDate?: boolean;
}) {
  const [mode, setMode] = useState<"region" | "category">("region"),
    [region, setRegion] = useState("World"),
    [category, setCategory] = useState<Category | "ALL">("ALL"),
    [country, setCountry] = useState(""),
    [query, setQuery] = useState("");
  const countries = useMemo(
    () =>
      [
        ...new Set(
          events.flatMap((e) => e.locations.map((l) => l.country).filter((c): c is string => !!c)),
        ),
      ].sort(),
    [events],
  );
  const filtered = useMemo(
    () => filterEvents(events, { region, category, country, query }),
    [events, region, category, country, query],
  );
  const active = region !== "World" || category !== "ALL" || country || query;
  return (
    <div className="explorer">
      <aside className="filter-rail" aria-label="Event filters">
        <div className="filter-heading">
          <SlidersHorizontal size={16} />
          <h2>{showDate ? "Refine the archive" : "Explore the day"}</h2>
        </div>
        <div className="segmented" aria-label="Browse filters">
          <button aria-pressed={mode === "region"} onClick={() => setMode("region")}>
            By region
          </button>
          <button aria-pressed={mode === "category"} onClick={() => setMode("category")}>
            By category
          </button>
        </div>
        <div className="filter-options">
          {mode === "region" ? (
            regions.map((r) => (
              <button
                key={r}
                className={region === r ? "selected" : ""}
                aria-pressed={region === r}
                onClick={() => setRegion(r)}
              >
                <span>
                  {r === "World" && <Globe2 size={16} />}
                  {r === "World" ? "All regions" : r}
                </span>
                <span className="count">
                  {
                    events.filter((e) => r === "World" || e.locations.some((l) => l.region === r))
                      .length
                  }
                </span>
              </button>
            ))
          ) : (
            <>
              <button
                className={category === "ALL" ? "selected" : ""}
                aria-pressed={category === "ALL"}
                onClick={() => setCategory("ALL")}
              >
                <span>All categories</span>
                <span className="count">{events.length}</span>
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  className={category === c ? "selected" : ""}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  <span>
                    <CategoryIcon category={c} />
                    {categoryLabels[c]}
                  </span>
                  <span className="count">{events.filter((e) => e.category === c).length}</span>
                </button>
              ))}
            </>
          )}
        </div>
        <label className="field-label" htmlFor="country">
          Country / historical territory
        </label>
        <select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <p className="filter-note">
          Borders and place names change. Locations follow the context of each record. Unmapped
          places appear in All regions.
        </p>
      </aside>
      <section className="event-results" aria-label="Historical events">
        <div className="results-toolbar">
          <p role="status">
            <strong>{filtered.length}</strong> {filtered.length === 1 ? "record" : "records"}
            {active ? ` of ${events.length}` : " in this collection"}
          </p>
          <label className="inline-search">
            <Search size={16} />
            <span className="sr-only">Filter these events</span>
            <input
              type="search"
              placeholder="Find within these records"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {active && (
          <div className="active-filters">
            <span>
              {[
                region !== "World" ? region : "",
                category !== "ALL" ? categoryLabels[category] : "",
                country,
                query ? `“${query}”` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <button
              className="text-button"
              onClick={() => {
                setRegion("World");
                setCategory("ALL");
                setCountry("");
                setQuery("");
              }}
            >
              Clear filters <X size={14} />
            </button>
          </div>
        )}
        {filtered.length > 0 ? (
          <div className="event-grid">
            {filtered.map((event) => (
              <EventCard key={event.slug} event={event} showDate={showDate} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Globe2 size={34} strokeWidth={1} />
            <h2>{events.length ? "A different lens may help." : "An open page in the archive."}</h2>
            <p>
              {events.length
                ? "No records match these filters. Clear them to return to the collection."
                : showDate
                  ? "No stored records match this search. Try a different name, place, or a broader phrase. The archive is still growing."
                  : "We don’t have verified records for this date yet. That doesn’t mean nothing happened. Try a nearby day or one of the featured dates."}
            </p>
            {active && (
              <button
                className="button"
                onClick={() => {
                  setRegion("World");
                  setCategory("ALL");
                  setCountry("");
                  setQuery("");
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        )}
        <p className="coverage-note">
          A cross-section, never the whole story. Coverage varies by date and source. Ongoing
          context is labeled separately from exact-day events.
        </p>
      </section>
    </div>
  );
}
