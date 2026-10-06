import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
const poolState = globalThis as typeof globalThis & { timelensPool?: Pool };
export function getPool() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "DATABASE_URL is missing. Copy .env.example to .env.local, configure PostgreSQL, and run npm run db:migrate.",
    );
  if (!poolState.timelensPool) {
    poolState.timelensPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 10000,
      // Keep the deadline client-side: transaction poolers can ignore/reject
      // PostgreSQL statement_timeout in the startup packet.
      query_timeout: 10000,
    });
    // Idle sockets can close when a managed PostgreSQL instance scales down.
    // Handle the pool event without exposing connection details to logs.
    poolState.timelensPool.on("error", () =>
      console.error("TimeLens: an idle PostgreSQL connection closed."),
    );
  }
  return poolState.timelensPool;
}
export async function closePool() {
  const pool = poolState.timelensPool;
  delete poolState.timelensPool;
  if (pool) await pool.end();
}
export function getDb() {
  return drizzle(getPool(), { schema });
}
