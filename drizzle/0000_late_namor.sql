CREATE TYPE "public"."date_precision" AS ENUM('DAY', 'MONTH', 'YEAR');--> statement-breakpoint
CREATE TYPE "public"."event_category" AS ENUM('POLITICS', 'WAR_CONFLICT', 'SCIENCE', 'TECHNOLOGY', 'SPACE', 'CULTURE', 'SPORTS', 'ECONOMY', 'DISASTER', 'SOCIETY', 'EXPLORATION', 'PEOPLE', 'OTHER');--> statement-breakpoint
CREATE TABLE "event_locations" (
	"event_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	CONSTRAINT "event_locations_event_id_location_id_pk" PRIMARY KEY("event_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "event_organizations" (
	"event_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	CONSTRAINT "event_organizations_event_id_organization_id_pk" PRIMARY KEY("event_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "event_people" (
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "event_people_event_id_person_id_pk" PRIMARY KEY("event_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "historical_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"dedupKey" text NOT NULL,
	"title" text NOT NULL,
	"short_description" text NOT NULL,
	"full_description" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"date_precision" date_precision DEFAULT 'DAY' NOT NULL,
	"category" "event_category" NOT NULL,
	"importance_score" integer DEFAULT 0 NOT NULL,
	"wikidata_id" text,
	"wikipedia_url" text,
	"image_url" text,
	"source_name" text NOT NULL,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historical_events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "historical_events_dedupKey_unique" UNIQUE("dedupKey"),
	CONSTRAINT "historical_events_wikidata_id_unique" UNIQUE("wikidata_id"),
	CONSTRAINT "valid_event_range" CHECK ("historical_events"."end_date" is null or "historical_events"."end_date" >= "historical_events"."start_date"),
	CONSTRAINT "valid_score" CHECK ("historical_events"."importance_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"requested_date" date NOT NULL,
	"status" text NOT NULL,
	"records_fetched" integer DEFAULT 0 NOT NULL,
	"records_inserted" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"region" text,
	"country" text,
	"country_code" text,
	"continent" text,
	"latitude" double precision,
	"longitude" double precision,
	CONSTRAINT "locations_key_unique" UNIQUE("key"),
	CONSTRAINT "latitude_range" CHECK ("locations"."latitude" between -90 and 90),
	CONSTRAINT "longitude_range" CHECK ("locations"."longitude" between -180 and 180)
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"wikidata_id" text,
	"wikipedia_url" text,
	CONSTRAINT "organizations_key_unique" UNIQUE("key"),
	CONSTRAINT "organizations_wikidata_id_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"wikidata_id" text,
	"wikipedia_url" text,
	CONSTRAINT "people_key_unique" UNIQUE("key"),
	CONSTRAINT "people_wikidata_id_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
ALTER TABLE "event_locations" ADD CONSTRAINT "event_locations_event_id_historical_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."historical_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_locations" ADD CONSTRAINT "event_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizations" ADD CONSTRAINT "event_organizations_event_id_historical_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."historical_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizations" ADD CONSTRAINT "event_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_people" ADD CONSTRAINT "event_people_event_id_historical_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."historical_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_people" ADD CONSTRAINT "event_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_location_reverse_idx" ON "event_locations" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "event_org_reverse_idx" ON "event_organizations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "event_person_reverse_idx" ON "event_people" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "event_dates_idx" ON "historical_events" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "event_category_idx" ON "historical_events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "event_search_idx" ON "historical_events" USING gin (to_tsvector('english', "title" || ' ' || "short_description"));--> statement-breakpoint
CREATE INDEX "ingestion_date_idx" ON "ingestion_runs" USING btree ("requested_date","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_ingestion_per_date" ON "ingestion_runs" USING btree ("requested_date") WHERE "ingestion_runs"."status" = 'running';--> statement-breakpoint
CREATE INDEX "location_region_idx" ON "locations" USING btree ("region");--> statement-breakpoint
CREATE INDEX "location_country_idx" ON "locations" USING btree ("country");