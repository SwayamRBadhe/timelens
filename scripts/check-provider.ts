import { WikidataProvider } from "../lib/history/providers/wikidata";
import { describeProviderFailure } from "../lib/history/providers/errors";
const date = process.argv.find((a) => a.startsWith("--date="))?.slice(7) ?? "1969-07-20";
new WikidataProvider()
  .fetchEventsForDate(date)
  .then((events) => {
    console.log(`Wikidata returned ${events.length} validated event records for ${date}.`);
  })
  .catch((error) => {
    console.error(
      `Wikidata check: ${error instanceof Error ? error.name : "Unknown error"}. The app will retain local records.`,
    );
    console.error(describeProviderFailure(error));
    process.exitCode = 1;
  });
