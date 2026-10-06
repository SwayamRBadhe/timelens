import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { normalizeDate, formatDate, shiftDate } from "@/lib/history/dates";
import { getHistory } from "@/lib/history/service";
import { DatePicker } from "@/components/date-picker";
import { EventExplorer } from "@/components/event-explorer";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Props = { params: Promise<{ date: string }> };
export async function generateMetadata({ params }: Props) {
  const { date } = await params;
  try {
    return { title: formatDate(date) };
  } catch {
    return { title: "Date not found" };
  }
}
export default async function DatePage({ params }: Props) {
  const { date } = await params;
  try {
    normalizeDate(date);
  } catch {
    notFound();
  }
  const result = await getHistory(date),
    previous = shiftDate(date, -1),
    next = shiftDate(date, 1);
  return (
    <main id="main" className="shell date-page">
      <div className="date-page-top">
        <Link href="/" className="text-link">
          <ArrowLeft size={15} /> Back to the world
        </Link>
        <DatePicker key={date} initial={date} compact />
      </div>
      <section className="date-heading">
        <div>
          <h1>
            {formatDate(date, "MMMM d")}, <span>{formatDate(date, "yyyy")}</span>
          </h1>
          <p>
            {formatDate(date, "EEEE")} <span>·</span> A world in parallel
          </p>
        </div>
        <nav className="day-nav" aria-label="Navigate dates">
          {previous ? (
            <Link
              href={`/date/${previous}`}
              prefetch={false}
              aria-label={`Previous day, ${formatDate(previous)}`}
            >
              <ArrowLeft size={17} />
              <span>Previous day</span>
            </Link>
          ) : (
            <span aria-disabled="true">Start of archive</span>
          )}
          {next && (
            <Link
              href={`/date/${next}`}
              prefetch={false}
              aria-label={`Next day, ${formatDate(next)}`}
            >
              <span>Next day</span>
              <ArrowRight size={17} />
            </Link>
          )}
        </nav>
      </section>
      {result.notice && (
        <div className="notice" role="status">
          <Info size={17} />
          <p>{result.notice}</p>
        </div>
      )}
      <EventExplorer key={date} events={result.events} />
      <div className="date-suggestions">
        Try another perspective:{" "}
        <Link href="/date/1989-11-09" prefetch={false}>
          November 9, 1989
        </Link>
        <Link href="/date/2001-09-11" prefetch={false}>
          September 11, 2001
        </Link>
        <Link href="/date/1947-08-15" prefetch={false}>
          August 15, 1947
        </Link>
      </div>
    </main>
  );
}
