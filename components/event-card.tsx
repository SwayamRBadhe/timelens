"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ChevronDown, MapPin } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { EventImage } from "./event-image";
import { categoryLabels, type HistoricalEvent } from "@/lib/history/types";
import { formatDate } from "@/lib/history/dates";
export function EventCard({
  event,
  showDate = false,
}: {
  event: HistoricalEvent;
  showDate?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const ongoing = !!event.endDate && event.endDate !== event.startDate;
  return (
    <article className={`event-card ${expanded ? "expanded" : ""}`}>
      <div className="event-meta">
        <span>
          <CategoryIcon category={event.category} />
          {categoryLabels[event.category]}
        </span>
        <span className={ongoing ? "context-badge" : "exact-badge"}>
          {ongoing ? "Ongoing context" : "On this day"}
        </span>
      </div>
      {showDate && (
        <Link prefetch={false} className="result-date" href={`/date/${event.startDate}`}>
          {formatDate(event.startDate)} <ArrowUpRight size={13} />
        </Link>
      )}
      {event.imageUrl && <EventImage url={event.imageUrl} />}
      <h3>
        <button
          className="event-title"
          aria-expanded={expanded}
          aria-controls={`detail-${event.slug}`}
          onClick={() => setExpanded(!expanded)}
        >
          {event.title}
        </button>
      </h3>
      <p className="event-description">{event.shortDescription}</p>
      <div className="event-location">
        <MapPin size={14} aria-hidden="true" />
        <span>
          {event.locations.length
            ? event.locations.map((l) => [l.name, l.country].filter(Boolean).join(", ")).join(" · ")
            : "Location not established"}
        </span>
      </div>
      <div className="event-bottom">
        <span className="source-label">{event.sourceName}</span>
        <button
          className="text-button"
          aria-label={`${expanded ? "Close" : "Read"} ${event.title}`}
          aria-expanded={expanded}
          aria-controls={`detail-${event.slug}`}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Close" : "Read story"}
          <ChevronDown size={15} className={expanded ? "rotate" : ""} />
        </button>
      </div>
      <section
        hidden={!expanded}
        className="event-detail"
        id={`detail-${event.slug}`}
        aria-label={`${event.title} details`}
      >
        <p>
          {event.fullDescription ??
            "This is a brief source-based record. Follow the source below for more context and the underlying historical account."}
        </p>
        <dl>
          <div>
            <dt>Recorded dates</dt>
            <dd>
              {formatDate(event.startDate)}
              {event.endDate ? ` – ${formatDate(event.endDate)}` : ""} ·{" "}
              {event.datePrecision.toLowerCase()} precision
            </dd>
          </div>
          {event.people.length > 0 && (
            <div>
              <dt>People</dt>
              <dd>{event.people.map((p) => p.name).join(", ")}</dd>
            </div>
          )}
          {event.organizations.length > 0 && (
            <div>
              <dt>Organizations</dt>
              <dd>{event.organizations.map((o) => o.name).join(", ")}</dd>
            </div>
          )}
        </dl>
        <p className="ranking-note">
          Discovery score {event.importanceScore}/100 reflects record completeness, not objective
          historical importance.
        </p>
        <div className="detail-links">
          {event.sourceUrl && (
            <a href={event.sourceUrl} target="_blank" rel="noreferrer">
              Original source <ArrowUpRight size={14} />
            </a>
          )}
          {event.wikipediaUrl && (
            <a href={event.wikipediaUrl} target="_blank" rel="noreferrer">
              Learn more on Wikipedia <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </section>
    </article>
  );
}
