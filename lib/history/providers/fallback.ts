import { deduplicate } from "../normalize";
import type { HistoryProvider } from "./types";
import { describeProviderFailure } from "./errors";
export async function fetchWithFallback(
  date: string,
  primary: HistoryProvider,
  fallback: HistoryProvider,
) {
  const local = await fallback.fetchEventsForDate(date);
  try {
    const external = await primary.fetchEventsForDate(date);
    return {
      events: deduplicate([...local, ...external]),
      fetched: external.length,
      error: undefined,
    };
  } catch (error) {
    // Store a sanitized diagnostic, never arbitrary upstream messages or connection strings.
    return {
      events: deduplicate(local),
      fetched: 0,
      error: describeProviderFailure(error),
    };
  }
}
