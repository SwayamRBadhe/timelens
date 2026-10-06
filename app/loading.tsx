export default function Loading() {
  return (
    <main className="shell loading-state" id="main" aria-busy="true">
      <p role="status">Opening the archive…</p>
      <div className="skeleton skeleton-heading" />
      <div className="skeleton" />
      <div className="skeleton" />
    </main>
  );
}
