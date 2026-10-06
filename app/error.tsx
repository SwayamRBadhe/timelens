"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="shell empty-state">
      <h1>The archive couldn’t open.</h1>
      <p>Something interrupted this request. Try again, or return to a featured date.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <Link className="text-link" href="/">
        Return home
      </Link>
    </main>
  );
}
