import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { ingestionRuns } from "../db/schema";
import { eventsForDate, persistEvents } from "../db/repository";
import { normalizeDate } from "./dates";
import { SeedProvider } from "./providers/seed";
import { WikidataProvider } from "./providers/wikidata";
import { fetchWithFallback } from "./providers/fallback";
import type { HistoryProvider } from "./providers/types";

const DAY_MS = 86_400_000;
const FAILURE_COOLDOWN_MS = 3_600_000;
const LEASE_MS = 120_000;
const GLOBAL_THROTTLE_MS = 15_000;
const EXPIRED_LEASE_ERROR = "Ingestion lease expired; safe to retry.";

export async function ingestDate(
  date: string,
  force = false,
  provider: HistoryProvider = new WikidataProvider(),
) {
  normalizeDate(date);
  const db = getDb();
  let cached = await eventsForDate(date);
  const seedProvider = new SeedProvider();
  const local = await seedProvider.fetchEventsForDate(date);
  const missing = local.filter((event) => !cached.some((existing) => existing.slug === event.slug));
  // Samples do not depend on external discovery, cooldowns, or another date's lease.
  if (missing.length) {
    try {
      await persistEvents(missing);
      cached = await eventsForDate(date);
    } catch {
      return {
        events: cached.length ? cached : local,
        notice:
          "PostgreSQL could not save sample records. Showing available stored records or labeled samples; check database permissions and migrations.",
      };
    }
  }
  if (!force && cached.length >= 3) return { events: cached };

  let runId: string | undefined;
  try {
    await db
      .update(ingestionRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        error: EXPIRED_LEASE_ERROR,
      })
      .where(
        and(
          eq(ingestionRuns.requestedDate, date),
          eq(ingestionRuns.status, "running"),
          lt(ingestionRuns.startedAt, new Date(Date.now() - LEASE_MS)),
        ),
      );
    const [recent] = await db
      .select()
      .from(ingestionRuns)
      .where(
        and(
          eq(ingestionRuns.requestedDate, date),
          gt(ingestionRuns.startedAt, new Date(Date.now() - DAY_MS)),
        ),
      )
      .orderBy(desc(ingestionRuns.startedAt))
      .limit(1);
    if (
      !force &&
      recent &&
      (recent.status !== "failed" ||
        (recent.error !== EXPIRED_LEASE_ERROR &&
          (recent.completedAt ?? recent.startedAt).getTime() > Date.now() - FAILURE_COOLDOWN_MS))
    ) {
      return {
        events: cached,
        notice:
          recent.status === "failed"
            ? "Live discovery is temporarily unavailable. Showing stored records."
            : recent.status === "running"
              ? "Live discovery is in progress. Showing stored records; try again shortly."
              : undefined,
      };
    }
    // Transaction-scoped locking is compatible with Neon's pooler and is released
    // before HTTP. The partial unique index holds the durable per-date lease.
    const lease = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(731942)`);
      const [active] = await tx
        .select({ id: ingestionRuns.id })
        .from(ingestionRuns)
        .where(gt(ingestionRuns.startedAt, new Date(Date.now() - GLOBAL_THROTTLE_MS)))
        .limit(1);
      if (active) return undefined;
      const [run] = await tx
        .insert(ingestionRuns)
        .values({ source: provider.name, requestedDate: date, status: "running" })
        .onConflictDoNothing()
        .returning({ id: ingestionRuns.id });
      return run;
    });
    if (!lease)
      return {
        events: cached,
        notice:
          "Live discovery is busy. Stored records are available; try this date again shortly.",
      };
    runId = lease.id;
    const result = await fetchWithFallback(date, provider, seedProvider);
    const inserted = await persistEvents(result.events);
    await db
      .update(ingestionRuns)
      .set({
        status: result.error ? "failed" : "success",
        recordsFetched: result.fetched,
        recordsInserted: inserted,
        completedAt: new Date(),
        error: result.error ?? null,
      })
      .where(eq(ingestionRuns.id, runId));
    return {
      events: await eventsForDate(date),
      notice: result.error
        ? "Live discovery is temporarily unavailable. Showing stored records."
        : undefined,
    };
  } catch {
    if (runId) {
      try {
        await db
          .update(ingestionRuns)
          .set({
            status: "failed",
            completedAt: new Date(),
            error: "Persistence failed. Check database connectivity and migrations.",
          })
          .where(eq(ingestionRuns.id, runId));
      } catch {
        /* A dropped database connection leaves a lease that expires later. */
      }
    }
    // Operational failures must not hide history already read successfully.
    return {
      events: cached,
      notice:
        "Live discovery is unavailable. Showing stored records; check database connectivity and migrations.",
    };
  }
}
