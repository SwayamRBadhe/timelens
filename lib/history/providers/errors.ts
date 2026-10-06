export type ProviderFailure = "timeout" | "network" | "http" | "invalid-response";

// Only fixed diagnostics and numeric HTTP statuses cross the ingestion boundary.
// Never persist arbitrary exception messages, response bodies, or connection URLs.
export class HistoryProviderError extends Error {
  constructor(
    readonly failure: ProviderFailure,
    readonly status?: number,
  ) {
    const reason = failure === "http" ? `HTTP ${status}` : failure;
    super(`Historical provider failed: ${reason}.`);
    this.name = "HistoryProviderError";
  }
}

export function describeProviderFailure(error: unknown): string {
  if (error instanceof HistoryProviderError) return error.message;
  return "Historical provider failed unexpectedly. Local records were retained.";
}
