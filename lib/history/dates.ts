import { format } from "date-fns";
import { UTCDate } from "@date-fns/utc";

// ISO Gregorian day strings are the storage and interchange boundary. Never store JS dates.
export const MIN_DATE = "1500-01-01";
export const MAX_DATE = "9999-12-31";
export function normalizeDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < MIN_DATE || value > MAX_DATE)
    throw new Error("Choose a Gregorian date from 1500 through 9999.");
  const [y, m, d] = value.split("-").map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d)
    throw new Error("That calendar date does not exist.");
  return value;
}
export function shiftDate(value: string, days: number): string | null {
  normalizeDate(value);
  if (!Number.isSafeInteger(days)) throw new Error("Day offsets must be safe integers.");
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  if (!Number.isFinite(date.getTime())) return null;
  const result = date.toISOString().slice(0, 10);
  return result < MIN_DATE || result > MAX_DATE || result.length !== 10 ? null : result;
}
export function formatDate(value: string, pattern = "MMMM d, yyyy"): string {
  normalizeDate(value);
  const [year, month, day] = value.split("-").map(Number);
  // Historical dates have no local timezone. UTCDate also preserves dates skipped by
  // civil timezone changes, such as 2011-12-30 in Pacific/Apia, during SSR and hydration.
  return format(new UTCDate(year, month - 1, day), pattern);
}
