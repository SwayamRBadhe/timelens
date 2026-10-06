import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  date,
  timestamp,
  integer,
  doublePrecision,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { categories } from "../history/types";
export const eventCategory = pgEnum("event_category", categories);
export const datePrecision = pgEnum("date_precision", ["DAY", "MONTH", "YEAR"]);
export const historicalEvents = pgTable(
  "historical_events",
  {
    id: uuid().defaultRandom().primaryKey(),
    slug: text().notNull().unique(),
    dedupKey: text().notNull().unique(),
    title: text().notNull(),
    shortDescription: text("short_description").notNull(),
    fullDescription: text("full_description"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    datePrecision: datePrecision("date_precision").notNull().default("DAY"),
    category: eventCategory().notNull(),
    importanceScore: integer("importance_score").notNull().default(0),
    wikidataId: text("wikidata_id").unique(),
    wikipediaUrl: text("wikipedia_url"),
    imageUrl: text("image_url"),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("event_dates_idx").on(t.startDate, t.endDate),
    index("event_category_idx").on(t.category),
    index("event_search_idx").using(
      "gin",
      sql`to_tsvector('english', ${t.title} || ' ' || ${t.shortDescription})`,
    ),
    check("valid_event_range", sql`${t.endDate} is null or ${t.endDate} >= ${t.startDate}`),
    check("valid_score", sql`${t.importanceScore} between 0 and 100`),
  ],
);
export const locations = pgTable(
  "locations",
  {
    id: uuid().defaultRandom().primaryKey(),
    key: text().notNull().unique(),
    name: text().notNull(),
    city: text(),
    region: text(),
    country: text(),
    countryCode: text("country_code"),
    continent: text(),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
  },
  (t) => [
    index("location_region_idx").on(t.region),
    index("location_country_idx").on(t.country),
    check("latitude_range", sql`${t.latitude} between -90 and 90`),
    check("longitude_range", sql`${t.longitude} between -180 and 180`),
  ],
);
export const people = pgTable("people", {
  id: uuid().defaultRandom().primaryKey(),
  key: text().notNull().unique(),
  name: text().notNull(),
  wikidataId: text("wikidata_id").unique(),
  wikipediaUrl: text("wikipedia_url"),
});
export const organizations = pgTable("organizations", {
  id: uuid().defaultRandom().primaryKey(),
  key: text().notNull().unique(),
  name: text().notNull(),
  wikidataId: text("wikidata_id").unique(),
  wikipediaUrl: text("wikipedia_url"),
});
export const eventLocations = pgTable(
  "event_locations",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => historicalEvents.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.locationId] }),
    index("event_location_reverse_idx").on(t.locationId),
  ],
);
export const eventPeople = pgTable(
  "event_people",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => historicalEvents.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.personId] }),
    index("event_person_reverse_idx").on(t.personId),
  ],
);
export const eventOrganizations = pgTable(
  "event_organizations",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => historicalEvents.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.organizationId] }),
    index("event_org_reverse_idx").on(t.organizationId),
  ],
);
export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid().defaultRandom().primaryKey(),
    source: text().notNull(),
    requestedDate: date("requested_date", { mode: "string" }).notNull(),
    status: text({ enum: ["running", "success", "failed"] }).notNull(),
    recordsFetched: integer("records_fetched").notNull().default(0),
    recordsInserted: integer("records_inserted").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error: text(),
  },
  (t) => [
    index("ingestion_date_idx").on(t.requestedDate, t.startedAt),
    index("ingestion_started_idx").on(t.startedAt),
    check("valid_ingestion_status", sql`${t.status} in ('running', 'success', 'failed')`),
    check("valid_ingestion_counts", sql`${t.recordsFetched} >= 0 and ${t.recordsInserted} >= 0`),
    uniqueIndex("one_active_ingestion_per_date")
      .on(t.requestedDate)
      .where(sql`${t.status} = 'running'`),
  ],
);
