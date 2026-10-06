import "./env";
import { closePool } from "../lib/db/client";
import { persistEvents } from "../lib/db/repository";
import { seedEvents } from "../lib/history/seed-data";
persistEvents(seedEvents)
  .then((count) =>
    console.log(
      `Inserted ${count} events (${seedEvents.length} curated records; existing duplicates retained).`,
    ),
  )
  .catch(() => {
    console.error(
      "Seed failed. Check DATABASE_URL and run npm run db:migrate first. See README.md.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
