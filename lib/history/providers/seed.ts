import { seedEvents } from "../seed-data";
import { occursOn } from "../types";
import { normalizeDate } from "../dates";
import type { HistoryProvider } from "./types";
export class SeedProvider implements HistoryProvider {
  readonly name = "TimeLens seed";
  async fetchEventsForDate(date: string) {
    normalizeDate(date);
    return seedEvents.filter((e) => occursOn(e, date));
  }
}
