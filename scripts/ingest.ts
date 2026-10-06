import "./env";
import { closePool } from "../lib/db/client";
import { ingestDate } from "../lib/history/ingestion";
import { normalizeDate } from "../lib/history/dates";
async function main() {
  const date = normalizeDate(process.argv.find((a) => a.startsWith("--date="))?.slice(7) ?? "");
  const result = await ingestDate(date, process.argv.includes("--force"));
  console.log(`${result.events.length} stored events for ${date}. ${result.notice ?? ""}`);
}
main()
  .catch(() => {
    console.error(
      "Ingestion failed. Use npm run ingest -- --date=1969-07-20. Confirm DATABASE_URL and migrations. --force bypasses date freshness, but respects the global provider throttle.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
