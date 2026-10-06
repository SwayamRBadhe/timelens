"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { MAX_DATE, MIN_DATE, normalizeDate } from "@/lib/history/dates";
export function DatePicker({
  initial = "1969-07-20",
  compact = false,
}: {
  initial?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initial),
    [error, setError] = useState(""),
    [pending, startTransition] = useTransition();
  return (
    <form
      className={`date-picker ${compact ? "compact" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        try {
          normalizeDate(date);
          setError("");
          startTransition(() => router.push(`/date/${date}`));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Choose a valid date.");
        }
      }}
    >
      <div className="date-input-wrap">
        <label htmlFor={compact ? "jump-date" : "explore-date"}>
          {compact ? "Jump to a date" : "Choose a moment in time"}
        </label>
        <input
          id={compact ? "jump-date" : "explore-date"}
          aria-describedby={error ? "date-error" : undefined}
          type="date"
          min={MIN_DATE}
          max={MAX_DATE}
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "Opening…" : compact ? "Go" : "Explore this day"}
        {pending ? <LoaderCircle size={18} className="spin" /> : <ArrowRight size={18} />}
      </button>
      {error && (
        <p id="date-error" role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}
