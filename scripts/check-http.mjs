import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const cases = [
  ["/", "Explore this day"],
  ["/date/1969-07-20", "Humanity arrives on the Moon"],
  ["/date/1989-11-09", "The Berlin Wall opens"],
  ["/date/2001-09-11", "The Americas adopt a democratic charter"],
  ["/date/1947-08-15", "A new trading order takes shape in Geneva"],
  ["/date/2000-01-01", "Computer systems pass the Y2K rollover"],
  ["/date/1969-07-19", "The Nigerian Civil War continues"],
  ["/date/1969-07-21", "The Nigerian Civil War continues"],
  ["/date/1500-01-01", "An open page in the archive"],
  ["/date/2000-02-30", "That page is outside our archive"],
  ["/search?q=NASA", "Humanity arrives on the Moon"],
  ["/search?q=Berlin", "The Berlin Wall opens"],
  ["/search?q=definitely-no-record-abcdef", "No stored records match this search"],
];
for (const [path, expected] of cases) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(55000) });
  const html = await response.text();
  assert.ok(response.ok || response.status === 404, `${path}: unexpected HTTP ${response.status}`);
  assert.ok(html.includes(expected), `${path}: missing expected rendered content`);
  assert.ok(!html.includes("postgresql://"), `${path}: database URL exposed`);
  if (path === "/date/2000-02-30")
    assert.ok(html.includes('content="noindex"'), "Invalid streamed route must be noindex");
  console.log(`PASS ${path}`);
}
console.log(
  "13 production HTTP checks passed. This verifies server rendering, not browser interaction.",
);
