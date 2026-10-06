import { and, desc, eq, inArray, lte, or, gte, sql } from "drizzle-orm";
import { getDb } from "./client";
import * as s from "./schema";
import { eventIdentityKey, normalizeEvent } from "../history/normalize";
import { normalizeDate } from "../history/dates";
import { eventSchema } from "../history/types";
import type { HistoricalEvent } from "../history/types";

export async function persistEvents(events: HistoricalEvent[]) {
  let inserted = 0;
  for (const input of events) {
    const event = normalizeEvent(input);
    await getDb().transaction(async (tx) => {
      const { locations, people, organizations, ...record } = event;
      const dedupKey = eventIdentityKey(event);
      const [row] = await tx
        .insert(s.historicalEvents)
        .values({ ...record, dedupKey })
        .onConflictDoNothing()
        .returning({ id: s.historicalEvents.id });
      if (!row) return;
      for (const location of locations) {
        const key = JSON.stringify([
          location.name,
          location.country ?? "",
          location.region ?? "",
        ]).toLowerCase();
        const [place] = await tx
          .insert(s.locations)
          .values({ ...location, key })
          .onConflictDoUpdate({ target: s.locations.key, set: { name: location.name } })
          .returning({ id: s.locations.id });
        await tx
          .insert(s.eventLocations)
          .values({ eventId: row.id, locationId: place.id })
          .onConflictDoNothing();
      }
      for (const person of people) {
        const key = person.wikidataId ?? person.name.toLowerCase();
        const [p] = await tx
          .insert(s.people)
          .values({ ...person, key })
          .onConflictDoUpdate({ target: s.people.key, set: { name: person.name } })
          .returning({ id: s.people.id });
        await tx
          .insert(s.eventPeople)
          .values({ eventId: row.id, personId: p.id })
          .onConflictDoNothing();
      }
      for (const organization of organizations) {
        const key = organization.wikidataId ?? organization.name.toLowerCase();
        const [o] = await tx
          .insert(s.organizations)
          .values({ ...organization, key })
          .onConflictDoUpdate({ target: s.organizations.key, set: { name: organization.name } })
          .returning({ id: s.organizations.id });
        await tx
          .insert(s.eventOrganizations)
          .values({ eventId: row.id, organizationId: o.id })
          .onConflictDoNothing();
      }
      inserted++;
    });
  }
  return inserted;
}
async function hydrate(
  rows: (typeof s.historicalEvents.$inferSelect)[],
): Promise<HistoricalEvent[]> {
  if (!rows.length) return [];
  const ids = rows.map((e) => e.id),
    db = getDb();
  const [places, persons, orgs] = await Promise.all([
    db
      .select({ eventId: s.eventLocations.eventId, item: s.locations })
      .from(s.eventLocations)
      .innerJoin(s.locations, eq(s.locations.id, s.eventLocations.locationId))
      .where(inArray(s.eventLocations.eventId, ids)),
    db
      .select({ eventId: s.eventPeople.eventId, item: s.people })
      .from(s.eventPeople)
      .innerJoin(s.people, eq(s.people.id, s.eventPeople.personId))
      .where(inArray(s.eventPeople.eventId, ids)),
    db
      .select({ eventId: s.eventOrganizations.eventId, item: s.organizations })
      .from(s.eventOrganizations)
      .innerJoin(s.organizations, eq(s.organizations.id, s.eventOrganizations.organizationId))
      .where(inArray(s.eventOrganizations.eventId, ids)),
  ]);
  const clean = (record: object) =>
    Object.fromEntries(Object.entries(record).filter(([, v]) => v !== null));
  return rows.map((row) =>
    eventSchema.parse({
      ...clean(row),
      locations: places.filter((p) => p.eventId === row.id).map((p) => clean(p.item)),
      people: persons.filter((p) => p.eventId === row.id).map((p) => clean(p.item)),
      organizations: orgs.filter((p) => p.eventId === row.id).map((p) => clean(p.item)),
    }),
  );
}
export async function eventsForDate(date: string) {
  normalizeDate(date);
  const e = s.historicalEvents;
  return hydrate(
    await getDb()
      .select()
      .from(e)
      .where(
        and(
          eq(e.datePrecision, "DAY"),
          lte(e.startDate, date),
          or(gte(e.endDate, date), eq(e.startDate, date)),
        ),
      )
      .orderBy(desc(e.importanceScore), e.title)
      .limit(200),
  );
}
export async function searchEvents(query: string) {
  const e = s.historicalEvents;
  const needle = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  return hydrate(
    await getDb()
      .select()
      .from(e)
      .where(
        sql`
    to_tsvector('english', ${e.title} || ' ' || ${e.shortDescription}) @@ plainto_tsquery('english', ${query})
    OR ${e.title} ILIKE ${needle}
    OR EXISTS (SELECT 1 FROM event_locations el JOIN locations l ON l.id = el.location_id WHERE el.event_id = ${e.id} AND (l.name ILIKE ${needle} OR l.country ILIKE ${needle} OR l.region ILIKE ${needle}))
    OR EXISTS (SELECT 1 FROM event_people ep JOIN people p ON p.id = ep.person_id WHERE ep.event_id = ${e.id} AND p.name ILIKE ${needle})
    OR EXISTS (SELECT 1 FROM event_organizations eo JOIN organizations o ON o.id = eo.organization_id WHERE eo.event_id = ${e.id} AND o.name ILIKE ${needle})
  `,
      )
      .orderBy(desc(e.importanceScore), e.startDate)
      .limit(100),
  );
}
