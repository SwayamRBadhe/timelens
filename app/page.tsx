import Link from "next/link";
import { ArrowRight, ArrowUpRight, Globe2, Orbit } from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { exampleDates } from "@/lib/history/seed-data";
import { formatDate } from "@/lib/history/dates";
export default function Home() {
  return (
    <main id="main">
      <section className="hero shell">
        <div className="hero-copy">
          <h1>
            See the world
            <br />
            on <em>any day</em>
            <br />
            in history.
          </h1>
          <p className="hero-description">
            One date. Countless stories.
            <br />
            Look beyond the headline and discover what else was happening around the world.
          </p>
          <DatePicker />
          <p className="date-hint">Begin anywhere from 1500 onward.</p>
        </div>
        <div className="hero-dispatch" aria-label="A preview of July 20, 1969">
          <div className="dispatch-top">
            <span>Sunday, July 20</span>
            <span>1969</span>
          </div>
          <div className="orbital-art" aria-hidden="true">
            <div className="orbit-line orbit-one" />
            <div className="orbit-line orbit-two" />
            <div className="moon-disc" />
            <span className="orbit-point" />
            <span className="orbital-coordinate">20:17 UTC · SEA OF TRANQUILITY</span>
          </div>
          <div className="dispatch-story">
            <span className="dispatch-category">
              <Orbit size={15} /> Space / The Moon
            </span>
            <h2>
              A small world.
              <br />A giant leap.
            </h2>
            <p>
              As Apollo 11 reaches the Moon, a cycling champion finishes in Paris and a civil war
              continues in Nigeria.
            </p>
            <Link prefetch={false} href="/date/1969-07-20">
              See the wider picture <ArrowRight size={17} />
            </Link>
          </div>
          <div className="dispatch-bottom">
            <Globe2 size={14} />
            <span>Different places. The same moment.</span>
          </div>
        </div>
      </section>
      <section className="featured shell" aria-labelledby="featured-title">
        <div className="section-heading">
          <h2 id="featured-title">A few places to begin.</h2>
          <span>Extraordinary dates. A wider lens.</span>
        </div>
        <div className="featured-grid">
          {exampleDates.map((example, i) => (
            <Link
              prefetch={false}
              className="featured-date"
              href={`/date/${example.date}`}
              key={example.date}
            >
              <span className="featured-year">
                {example.date.slice(0, 4)}
                <ArrowUpRight size={22} />
              </span>
              <span className="featured-calendar">{formatDate(example.date, "MMMM d")}</span>
              <h3>{example.label}</h3>
              <p>{example.note}</p>
              <span className={`date-marker marker-${i}`} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <section id="about" className="about-section shell">
        <h2>
          History didn’t happen
          <br />
          one story at a time.
        </h2>
        <div>
          <p>
            While one moment made the front page, life was unfolding everywhere else. TimeLens
            brings those parallel stories into view—across places, disciplines, and perspectives.
          </p>
          <p className="muted">
            Explore source-linked records, distinguish the day’s events from ongoing context, and
            follow your curiosity. This is a growing collection, not a complete account of the past.
          </p>
          <Link className="text-link" href="/search">
            Explore the archive <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
