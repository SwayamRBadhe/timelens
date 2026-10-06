import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell empty-state">
      <h1>That page is outside our archive.</h1>
      <p>Choose a valid Gregorian date from 1500 onward, or return to the starting point.</p>
      <Link className="button primary" href="/">
        Back to TimeLens
      </Link>
    </main>
  );
}
