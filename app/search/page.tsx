import { Search } from "lucide-react";
import { findHistory } from "@/lib/history/service";
import { EventExplorer } from "@/components/event-explorer";
export const dynamic = "force-dynamic";
export const metadata = { title: "Search the archive" };
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams,
    query = (typeof params.q === "string" ? params.q : "").trim().slice(0, 120);
  const result = await findHistory(query);
  return (
    <main className="shell search-page" id="main">
      <h1>
        Follow a thread
        <br />
        <em>through history.</em>
      </h1>
      <p className="search-intro">Find people, places, and events across the stored archive.</p>
      <form action="/search" className="archive-search">
        <label className="sr-only" htmlFor="archive-query">
          Search stored historical events
        </label>
        <Search size={21} />
        <input
          id="archive-query"
          type="search"
          name="q"
          placeholder="Try Apollo, India, Berlin, NASA…"
          defaultValue={query}
          maxLength={120}
          required
        />
        <button className="button primary">Search</button>
      </form>
      {query ? (
        <>
          <h2 className="search-results-title">Results for “{query}”</h2>
          {result.notice && (
            <p role="status" className="notice">
              {result.notice}
            </p>
          )}
          <EventExplorer key={query} events={result.events} showDate />
        </>
      ) : (
        <div className="search-prompts">
          <p>A name. A place. A turning point.</p>
          {["Apollo", "India", "Berlin", "NASA", "World War"].map((q) => (
            <a className="button" key={q} href={`/search?q=${encodeURIComponent(q)}`}>
              {q}
            </a>
          ))}
          <p className="muted">
            Search reads stored records. It does not trigger external ingestion.
          </p>
        </div>
      )}
    </main>
  );
}
