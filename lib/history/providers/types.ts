import type { HistoricalEvent } from "../types";
export interface HistoryProvider {
  readonly name: string;
  fetchEventsForDate(date: string): Promise<HistoricalEvent[]>;
}
