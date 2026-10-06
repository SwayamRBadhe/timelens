import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { closePool, getDb, getPool } from "../lib/db/client";
import { historicalEvents, ingestionRuns } from "../lib/db/schema";
import { eventsForDate, persistEvents } from "../lib/db/repository";
import { ingestDate } from "../lib/history/ingestion";
import { seedEvents } from "../lib/history/seed-data";
import { HistoryProviderError } from "../lib/history/providers/errors";

const testUrl = process.env.TIMELENS_TEST_DATABASE_URL;
const source = "TimeLens integration test";
let safeToClean = false;
describe.skipIf(!testUrl)("PostgreSQL ingestion regression checks (disposable database)", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testUrl;
    const { rows } = await getPool().query<{ name: string }>("SELECT current_database() AS name");
    if (!/(_test|_review)$/.test(rows[0].name))
      throw new Error(
        "Integration tests require a disposable database ending in _test or _review.",
      );
    safeToClean = true;
  });
  beforeEach(async () => {
    await getDb().delete(ingestionRuns).where(eq(ingestionRuns.source, source));
  });
  afterAll(async () => {
    if (safeToClean) {
      await getDb().delete(ingestionRuns).where(eq(ingestionRuns.source, source));
      await getDb().delete(historicalEvents).where(eq(historicalEvents.sourceName, source));
    }
    await closePool();
  });
  it("persists available samples even when external discovery is throttled", async () => {
    await getDb()
      .insert(ingestionRuns)
      .values({ source, requestedDate: "1600-01-01", status: "running" });
    const request = vi.fn(async () => []);
    const result = await ingestDate("1947-08-15", true, {
      name: source,
      fetchEventsForDate: request,
    });
    expect(result.events.length).toBeGreaterThanOrEqual(3);
    expect((await eventsForDate("1947-08-15")).length).toBeGreaterThanOrEqual(3);
    expect(request).not.toHaveBeenCalled();
  });
  it("caches an empty successful fetch instead of refetching on each render", async () => {
    const request = vi.fn(async () => []);
    await ingestDate("1600-01-02", false, { name: source, fetchEventsForDate: request });
    await ingestDate("1600-01-02", false, { name: source, fetchEventsForDate: request });
    expect(request).toHaveBeenCalledTimes(1);
    const [run] = await getDb()
      .select()
      .from(ingestionRuns)
      .where(eq(ingestionRuns.source, source));
    expect(run.status).toBe("success");
    expect(run.recordsFetched).toBe(0);
  });
  it("records a safe failure and respects the failure cooldown", async () => {
    const request = vi.fn(async () => {
      throw new HistoryProviderError("timeout");
    });
    await ingestDate("1600-01-03", false, { name: source, fetchEventsForDate: request });
    const second = await ingestDate("1600-01-03", false, {
      name: source,
      fetchEventsForDate: request,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(second.notice).toContain("temporarily unavailable");
    const [run] = await getDb()
      .select()
      .from(ingestionRuns)
      .where(eq(ingestionRuns.source, source));
    expect(run.status).toBe("failed");
    expect(run.error).toContain("timeout");
  });
  it("allows at most one provider call for concurrent requests", async () => {
    const request = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return [];
    });
    await Promise.all([
      ingestDate("1600-01-04", false, { name: source, fetchEventsForDate: request }),
      ingestDate("1600-01-04", false, { name: source, fetchEventsForDate: request }),
    ]);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("keeps non-seed stored history if persistence of enrichment fails", async () => {
    const fixture = {
      ...seedEvents[0],
      slug: "timelens-test-stored-record",
      title: "Synthetic database fixture",
      shortDescription: "Test record only, not a historical claim.",
      startDate: "1600-01-05",
      sourceName: source,
    };
    await persistEvents([fixture]);
    const result = await ingestDate(fixture.startDate, true, {
      name: source,
      fetchEventsForDate: async () => [
        { ...fixture, slug: "timelens-test-invalid-record", title: "" },
      ],
    });
    expect(result.events.some((event) => event.slug === fixture.slug)).toBe(true);
    expect(result.notice).toContain("Showing stored records");
  });
  it("does not reuse an expired running lease as a fresh successful cache", async () => {
    await getDb()
      .insert(ingestionRuns)
      .values({
        source,
        requestedDate: "1600-01-06",
        status: "running",
        startedAt: new Date(Date.now() - 180000),
      });
    const request = vi.fn(async () => []);
    const result = await ingestDate("1600-01-06", false, {
      name: source,
      fetchEventsForDate: request,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(result.notice).toBeUndefined();
    const runs = await getDb().select().from(ingestionRuns).where(eq(ingestionRuns.source, source));
    expect(runs.map((run) => run.status).sort()).toEqual(["failed", "success"]);
  });
});
