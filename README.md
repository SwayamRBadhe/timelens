# TimeLens

**See the world on any day in history.**

A historical exploration application: choose a date and explore simultaneous, source-linked stories by region, country, and category. Exact-day events and ongoing historical context are visibly distinguished. No accounts, payments, separate API server, or background workers.

## Requirements

- Node.js 22.13+ (Node 24 LTS recommended) and npm.
- PostgreSQL 16+ installed and running locally, or a Neon PostgreSQL database.
- Network access for package installation and optional Wikidata discovery. Seeded exploration works without Wikidata.

The lockfile pins the installed dependencies, including Next.js 16.3.8, React 19, Tailwind 4, Drizzle, `pg`, Zod, date-fns, and Lucide. Typography is bundled locally; rendering and building do not contact Google Fonts. Native accessible controls are used where a component library would add no benefit.

## Create the local PostgreSQL database

These commands use your existing PostgreSQL administrator account. Replace `password` in the connection URL with the password you chose when installing PostgreSQL. TimeLens does not change that password.

If `psql` is on your PATH:

```sh
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE timelens;"
```

On Windows PowerShell with PostgreSQL 16 in its default installation directory:

```powershell
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -h localhost -U postgres -d postgres -c 'CREATE DATABASE timelens;'
```

Enter your existing PostgreSQL password when prompted. If the database already exists, skip creation. To confirm:

```powershell
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -h localhost -U postgres -d timelens -c 'SELECT current_database();'
```

The SQL Shell installed with PostgreSQL is another option: connect to database `postgres` as user `postgres`, then run `CREATE DATABASE timelens;`.

## Install and run

From the project directory:

```powershell
npm install
Copy-Item .env.example .env.local
```

Edit `.env.local`:

```dotenv
DATABASE_URL=postgresql://postgres:password@localhost:5432/timelens
```

URL-encode special characters in your password, such as `@` as `%40`. Do not use a `NEXT_PUBLIC_` prefix. `.env.local` and other real environment files are gitignored; `.env.example` contains only a placeholder.

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3000**. Try `/date/1969-07-20`, the other featured dates, or `/search?q=NASA`. On macOS/Linux use `cp .env.example .env.local` instead of `Copy-Item`.

Without a configured or reachable database, the app clearly labels its built-in sample collection. Sample search is also labeled. This is a demonstration fallback, not persistence: live ingestion is disabled until the database works. CLI commands exit unsuccessfully with configuration guidance if PostgreSQL is unavailable.

## Commands

- `npm run dev` — Next.js development server.
- `npm run build` — production build; does not require a database or perform migrations.
- `npm start` — serve the production build.
- `npm run lint` — ESLint including Next.js and TypeScript rules.
- `npm run typecheck` — strict TypeScript checking.
- `npm test` — 48 offline date, normalization, deduplication, ranking, filtering, and provider/fallback tests. Six PostgreSQL regression tests are skipped unless explicitly configured below.
- `npm run db:generate` — generate and review SQL migrations after changing the schema.
- `npm run db:migrate` — apply checked-in migrations to `DATABASE_URL`.
- `npm run db:seed` — insert the curated collection, safely repeatable without duplicates.
- `npm run ingest -- --date=1969-07-20` — ingest one date using the cache/provider pipeline.
- `npm run ingest -- --date=1969-07-20 --force` — bypass that date’s freshness check while retaining upstream throttling.
- `npm run db:check` — integration smoke check on your migrated development database; inserts seeds if absent, checks idempotency, date queries, search, and cache hits. Do not point test commands at production.
- `node scripts/check-http.mjs` — exercise 13 server-rendered routes against a running app (defaults to localhost:3000; override with `TEST_BASE_URL`).
- `npx tsx scripts/check-provider.ts --date=1969-07-20` — bounded live provider diagnostic, separate from the offline test suite.

CLI tools load `.env.local`, then `.env`, and respect already-set environment variables. A production URL can therefore be supplied in the shell without modifying local files.

## Architecture

```text
app/                       App Router pages, metadata, loading/error states
components/                Date picker, exploration filters, event details
lib/db/schema.ts           PostgreSQL schema, constraints, relationships/indexes
lib/db/repository.ts       Transactional inserts, joins, full-text search
lib/db/client.ts           Lazy, bounded node-postgres connection pool
lib/history/service.ts     Server-only UI boundary and graceful fallback
lib/history/ingestion.ts   Durable cache, leases, cooldowns, ingestion runs
lib/history/providers/    HistoryProvider, Wikidata, seed fallback
lib/history/normalize.ts   Zod normalization and deduplication
lib/history/ranking.ts     Transparent discovery ranking
lib/history/dates.ts       Gregorian day-only validation and navigation
lib/history/seed-data.ts   Source-linked curated sample records
drizzle/                  Generated SQL migrations and metadata
scripts/                  Migrations, seeding, ingestion, integration checks
tests/                    Focused unit tests; no network or DB required
```

The UI never calls Wikidata. Server-rendered routes load the history service. Client components receive serializable normalized events and perform immediate combined region/category/country/text filtering. Search is a server-rendered GET form with a shareable URL; database queries use parameterized PostgreSQL full-text search plus literal substring and relationship matching for people, organizations, and places.

### PostgreSQL model

`historical_events`, `locations`, `people`, `organizations`, three event relationship tables, and `ingestion_runs`. PostgreSQL date columns use string mode; timestamps are reserved for operational metadata. Foreign keys cascade join-table cleanup. Unique slugs, Wikidata IDs, canonical date/title keys, and join keys prevent exact duplicate storage. Inserts are transactional per event, including its relationships.

Indexes cover dates, category, geographic filters, reverse relationships, a GIN English text-search expression, and ingestion lookup. Date searches return at most 200 records; archive searches at most 100. Region is an explicit metadata field, not inferred from modern borders. Unknown places remain visible in All regions. Central America is grouped under North America; off-world places have no terrestrial coordinates.

### Provider and caching flow

1. Validate `YYYY-MM-DD` input.
2. Query PostgreSQL for exact-day events and inclusive ongoing ranges; persist any applicable missing sample records independently of external throttling.
3. Three usable stored records satisfy the V1 cache threshold.
4. Otherwise consult durable `ingestion_runs`: successful/empty fetches are cached for 24 hours; failed requests cool down for one hour.
5. Acquire a database-backed per-date lease and global 15-second request throttle. A short transaction advisory lock coordinates the claim across instances; it is released before the network request. Stale leases recover after two minutes and can retry immediately without an additional failure cooldown.
6. Query Wikidata, normalize records, merge with applicable seeds, deduplicate, score, and persist.
7. Record fetched/inserted counts, status, completion time, and sanitized error information, including timeout, HTTP status, or invalid-response diagnostics. An operational ingestion failure preserves history already read successfully. A database read failure returns clearly labeled samples.

No page prefetch initiates date ingestion. No critical cache state lives only in memory. The reusable pool is a connection-management optimization, not a data cache. There is no public administrative ingestion endpoint; the CLI is the explicit refresh mechanism. Global throttling is intentionally conservative for a public, unauthenticated V1.

### Wikidata integration

Uses the [official SPARQL service](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service) at `https://query.wikidata.org/sparql`, with a descriptive User-Agent and JSON response validation. Queries use point-in-time (`P585`) or start-time (`P580`) statements, require Gregorian calendar and day precision, and restrict results to event instances. The inner query selects at most 35 events; the outer query returns at most 200 rows to accommodate relationships.

The query binds the exact date first, then follows statement relationships and checks the event ontology in the forward direction. It uses the official endpoint's query-planner hints to avoid enumerating the global event tree before restricting the date. See [Wikidata's optimization guidance](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/query_optimization). Labels remain outside the limited candidate subquery.

Each request has a 6.5-second timeout, with at most one retry after 350ms for connection errors or HTTP 5xx responses. Timeouts, HTTP 429/other client errors, and malformed responses are not immediately repeated. Endpoint failure never discards already stored records. English labels/descriptions and English Wikipedia links are preferred. Records without usable English descriptions are omitted. Locations are preserved when supplied; region inference, detailed participants, images, and rich subclass-based categorization are deliberately conservative in this first adapter.

Add a future source by implementing `HistoryProvider.fetchEventsForDate(date)`, returning validated `HistoricalEvent` records, then registering it in the orchestration layer. Do not put provider calls in client components. Raw upstream responses are not persisted.

### Dates and ranking

V1 accepts Gregorian `1500-01-01` through `9999-12-31`. A four-digit ISO string is the day boundary, not a JavaScript timestamp. Arithmetic uses UTC; date-fns display formatting uses its `@date-fns/utc` companion so server and browser timezone differences cannot change the displayed day. This also preserves dates skipped by local timezone changes, such as December 30, 2011 in Pacific/Apia. Calendar validity includes Gregorian leap-year rules. `datePrecision` preserves day/month/year intent; non-day records are excluded from exact-day queries. BCE, alternate calendars, and more nuanced uncertainty need a future representation and migration.

The ranking function starts at 20, then rewards a Wikipedia article (20), source link (10), fuller description (10), known location (10), people (up to 10), organizations (up to 10), multiple mapped regions (5), and a classified category (5), capped at 100. Normalization removes repeated relationships before ranking. Persisted scores are read consistently rather than silently recalculated during hydration. This is a record-completeness/discoverability heuristic, **not an objective measure of historical importance**.

### Sample collection and historical care

All five requested dates have multiple sourced records. Every seed source is prefixed `TimeLens seed`. Long-running events are labeled **Ongoing context** and do not imply a specific new development on the selected day. The Apollo record distinguishes the July 20 UTC landing from the July 21 UTC first step; the Panama record distinguishes the December 31 handover from the first full day afterward. Popular year-2000 celebrations are distinguished from the Gregorian millennium boundary in 2001.

This is a demonstration collection, not a comprehensive chronology. Sources are linked on every detail view, and the UI avoids assigning modern countries to uncertain historical locations.

## Deploy to Vercel with Neon

1. Create a Neon project/database. Keep TLS enabled; copy the PostgreSQL URL from Neon’s connection dialog.
2. Use the pooled URL (`-pooler` host) as **DATABASE_URL** in Vercel’s production environment. Set preview deployments to a separate Neon branch/database. There is no provider-specific database API in the application.
3. Before deployment, apply migrations from a trusted workstation or CI job. Temporarily set **DATABASE_URL** to the target database’s direct/unpooled connection string (same variable name), including `sslmode=require`, then run `npm run db:migrate` and optionally `npm run db:seed`.
4. Import the repository in Vercel using the Next.js preset, install with `npm ci`, and build with `npm run build`. Select Node 24 (or supported Node 22). Place the function region close to your Neon region.
5. Deploy and verify a seeded date and stored-event search. The date route has a 60-second maximum duration; actual provider attempts are much shorter. All database work uses the Node runtime, not Edge.

Example PowerShell migration workflow (replace the placeholder with your actual Neon URL locally; never commit it):

```powershell
$env:DATABASE_URL = 'postgresql://USER:PASSWORD@DIRECT_HOST/neondb?sslmode=require'
npm run db:migrate
npm run db:seed
Remove-Item Env:DATABASE_URL
```

Builds do not mutate production data. Run migrations once per deployment through a controlled job; do not have multiple deployment jobs apply them simultaneously. Back up production before schema changes. To move existing local data instead of just seeds, use PostgreSQL `pg_dump`/`pg_restore` against the direct Neon URL, on a fresh target, rather than applying seeds as a migration of user data. See [Neon’s connection guidance](https://neon.com/docs/connect/connect-from-any-app) and [Next.js deployment documentation](https://nextjs.org/docs/app/getting-started/deploying).

## Limitations and Phase 2

- Coverage is sparse, English-biased, and dependent on Wikidata event/date modeling. Exact-day queries cannot reconstruct all ongoing world conditions. Empty results are not evidence that nothing happened.
- Deduplication is exact ID/slug/canonical title-based; semantically equivalent records with different titles can still need editorial reconciliation.
- Seeds are inserted idempotently, not automatically overwritten; editorial updates should use reviewed data migrations.
- Search is bounded and unpaginated. Very large archives need pagination and additional location/entity search indexes.
- Unknown Wikidata categories remain Other; unmapped locations appear under All regions. No automatic geopolitical inference.
- No image ingestion or interactive map is enabled yet; the schema carries image URLs and geographic coordinates for later work. No mandatory external image dependencies.
- At implementation time, `npm audit --omit=dev` reported zero production vulnerabilities. The full audit reported nine findings in Drizzle/ESLint transitive development tooling (esbuild and braces chains); no compatible upstream fix was available for the full set. Recheck when upgrading. Do not expose development tooling servers publicly.
- Prefer next: broader reviewed sources, date uncertainty/provenance, better categorization and geographic enrichment, semantic duplicate review, pagination, then a MapLibre view. Keep the date exploration workflow primary.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. After configuring a disposable/development PostgreSQL database and applying migrations, run `npm run db:check`. It verifies real PostgreSQL persistence and joins, repeat seed deduplication, search across events/entities/locations, literal wildcard escaping, and seeded cache behavior.

Browser QA checklist: landing date submission; event expansion; combined filters and reset; previous/next days; stored searches; invalid date page; empty collection; narrow mobile layout; keyboard navigation; system dark mode; unavailable database/provider messages.

The repository review passed lint, strict type checking, a production build, and 54 tests (48 offline tests plus six PostgreSQL ingestion regressions), as well as PostgreSQL seeding/search/cache smoke checks and 13 production HTTP route assertions in each of sample and database modes (26 total). The PostgreSQL regression suite checks throttle-independent samples, cached empty results, failure diagnostics/cooldowns, concurrent requests, preservation of stored history on ingestion failure, and expired-lease recovery.

These checks use an isolated real PostgreSQL 16 cluster because credentials for the pre-existing server were not supplied. In a direct comparison, the original July 20, 1969 query returned four rows in about 5.9 seconds, while the date-first version returned the same four rows in about 0.4 seconds. The reviewed provider successfully normalized and persisted a live record alongside the seeds. These are measurements from this run, not a latency guarantee.

To run the optional database regressions, use a migrated disposable database whose name ends in `_test` or `_review`:

```powershell
$env:TIMELENS_TEST_DATABASE_URL = 'postgresql://postgres:YOUR_PASSWORD@localhost:5432/timelens_test'
npm test
Remove-Item Env:TIMELENS_TEST_DATABASE_URL
```

Create that disposable database and apply migrations first, temporarily setting `DATABASE_URL` to its URL. Tests clean up only their own marked fixtures; do not point them at a production database. `DATABASE_URL` remains the only application database configuration.

The application uses the same node-postgres connection path for local PostgreSQL and Neon, with TLS configured by the connection URL. Pool reuse avoids excess connections on development reloads, and transaction-scoped advisory locks suit Neon's transaction pooler. An eight-second connection deadline accommodates database wakeup; a ten-second client query deadline avoids relying on startup `statement_timeout` parameters, which hosted poolers can ignore or reject. Actual Neon/Vercel deployment is unverified because no production credentials were supplied. Restart the app after changing `DATABASE_URL`.

No browser was connected to the available UI tools, so desktop/mobile screenshots and interactive browser QA remain unverified. The code review improved small-screen date submission, touch targets, event disclosure accessibility, and long-text wrapping; no visual screenshot sign-off is claimed.
