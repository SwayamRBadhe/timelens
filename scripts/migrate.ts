import "./env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closePool } from "../lib/db/client";
async function main() {
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  console.log("TimeLens migrations applied.");
}
main()
  .catch(() => {
    console.error(
      "Migration failed. Set DATABASE_URL in .env.local, create the timelens PostgreSQL database, and confirm your credentials. See README.md.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
