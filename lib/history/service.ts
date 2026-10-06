import "server-only";
import { searchEvents } from "../db/repository";
import { ingestDate } from "./ingestion";
import { normalizeDate } from "./dates";
import { seedEvents } from "./seed-data";
import { SeedProvider } from "./providers/seed";
import type { HistoryResult } from "./types";
const configurationNotice =
  "Sample collection · PostgreSQL is not configured. Set DATABASE_URL and run the migrations and seed command to enable persistence and live discovery.";
export async function getHistory(date: string): Promise<HistoryResult> {
  normalizeDate(date);
  if (!process.env.DATABASE_URL)
    return {
      events: await new SeedProvider().fetchEventsForDate(date),
      mode: "sample",
      notice: configurationNotice,
    };
  try {
    return { ...(await ingestDate(date)), mode: "database" };
  } catch {
    return {
      events: await new SeedProvider().fetchEventsForDate(date),
      mode: "sample",
      notice:
        "PostgreSQL could not be reached or needs migrations. Showing the sample collection; check DATABASE_URL and run npm run db:migrate.",
    };
  }
}
export async function findHistory(query: string): Promise<HistoryResult> {
  const q = query.trim().slice(0, 120);
  if (!q) return { events: [], mode: "database" };
  if (process.env.DATABASE_URL) {
    try {
      return { events: await searchEvents(q), mode: "database" };
    } catch {
      /* Continue into labeled sample search. */
    }
  }
  return {
    events: seedEvents.filter((e) =>
      [
        e.title,
        e.shortDescription,
        ...e.locations.flatMap((l) => [l.name, l.country, l.region]),
        ...e.people.map((p) => p.name),
        ...e.organizations.map((o) => o.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()),
    ),
    mode: "sample",
    notice: process.env.DATABASE_URL
      ? "Database search is unavailable. Results below come from the sample collection."
      : configurationNotice,
  };
}
