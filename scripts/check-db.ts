import "./env";
import assert from "node:assert/strict";
import { closePool } from "../lib/db/client";
import { eventsForDate, persistEvents, searchEvents } from "../lib/db/repository";
import { seedEvents } from "../lib/history/seed-data";
import { ingestDate } from "../lib/history/ingestion";
async function main() {
  const inserted = await persistEvents(seedEvents);
  assert.equal(await persistEvents(seedEvents), 0, "Seeding must be idempotent");
  for (const date of ["1969-07-20", "1989-11-09", "2001-09-11", "1947-08-15", "2000-01-01"])
    assert.ok((await eventsForDate(date)).length >= 3, `Missing date: ${date}`);
  for (const q of ["Apollo", "India", "Berlin", "NASA", "Neil Armstrong", "Lima"])
    assert.ok((await searchEvents(q)).length > 0, `Missing search match: ${q}`);
  assert.equal((await searchEvents("' OR 1=1 --")).length, 0, "Search is parameterized");
  assert.equal((await searchEvents("%_\\")).length, 0, "Wildcards are escaped");
  let providerCalled = false;
  const cached = await ingestDate("1969-07-20", false, {
    name: "Cache check",
    fetchEventsForDate: async () => {
      providerCalled = true;
      return [];
    },
  });
  assert.equal(providerCalled, false, "A seeded cache hit must not call the provider");
  assert.ok(
    seedEvents
      .filter((event) => event.startDate === "1969-07-20")
      .every((seed) => cached.events.some((event) => event.slug === seed.slug)),
    "Cached seed records remain available, even when live imports add records",
  );
  console.log(
    `PostgreSQL integration passed: ${inserted} inserted, repeat seed 0, five dates, six searches, safe query escaping, cache hit.`,
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof assert.AssertionError
        ? error.message
        : "Database check failed. Verify configuration and migrations.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
