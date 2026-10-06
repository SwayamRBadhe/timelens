import { z } from "zod";
import { normalizeDate } from "./dates";
export const categories = [
  "POLITICS",
  "WAR_CONFLICT",
  "SCIENCE",
  "TECHNOLOGY",
  "SPACE",
  "CULTURE",
  "SPORTS",
  "ECONOMY",
  "DISASTER",
  "SOCIETY",
  "EXPLORATION",
  "PEOPLE",
  "OTHER",
] as const;
export type Category = (typeof categories)[number];
export const categoryLabels: Record<Category, string> = {
  POLITICS: "Politics",
  WAR_CONFLICT: "War & conflict",
  SCIENCE: "Science",
  TECHNOLOGY: "Technology",
  SPACE: "Space",
  CULTURE: "Culture",
  SPORTS: "Sports",
  ECONOMY: "Economy",
  DISASTER: "Disaster",
  SOCIETY: "Society",
  EXPLORATION: "Exploration",
  PEOPLE: "People",
  OTHER: "Other",
};
export const regions = [
  "World",
  "North America",
  "South America",
  "Europe",
  "Asia",
  "Africa",
  "Oceania",
  "Middle East",
] as const;
const day = z.string().refine((v) => {
  try {
    normalizeDate(v);
    return true;
  } catch {
    return false;
  }
}, "Invalid historical date");
const url = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//.test(v));
export const locationSchema = z.object({
  name: z.string().trim().min(1),
  city: z.string().optional(),
  region: z.enum(regions).optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  continent: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export const entitySchema = z.object({
  name: z.string().trim().min(1),
  wikidataId: z
    .string()
    .regex(/^Q\d+$/)
    .optional(),
  wikipediaUrl: url.optional(),
});
export const eventSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(1).max(300),
    shortDescription: z.string().trim().min(1).max(1200),
    fullDescription: z.string().trim().min(1).optional(),
    startDate: day,
    endDate: day.optional(),
    datePrecision: z.enum(["DAY", "MONTH", "YEAR"]).default("DAY"),
    category: z.enum(categories),
    importanceScore: z.number().int().min(0).max(100).default(0),
    wikidataId: z
      .string()
      .regex(/^Q\d+$/)
      .optional(),
    wikipediaUrl: url.optional(),
    imageUrl: url.optional(),
    sourceName: z.string().trim().min(1),
    sourceUrl: url.optional(),
    locations: z.array(locationSchema).default([]),
    people: z.array(entitySchema).default([]),
    organizations: z.array(entitySchema).default([]),
  })
  .refine((e) => !e.endDate || e.endDate >= e.startDate, "End precedes start");
export type HistoricalEvent = z.infer<typeof eventSchema>;
export type HistoryResult = {
  events: HistoricalEvent[];
  mode: "database" | "sample";
  notice?: string;
};
export function occursOn(event: HistoricalEvent, date: string) {
  return (
    event.datePrecision === "DAY" &&
    event.startDate <= date &&
    (event.endDate ?? event.startDate) >= date
  );
}
