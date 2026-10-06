import { normalizeEvent } from "./normalize";
import type { Category, HistoricalEvent } from "./types";

type Seed = {
  slug: string;
  title: string;
  description: string;
  date: string;
  end?: string;
  category: Category;
  source: string;
  url: string;
  locations: HistoricalEvent["locations"];
  detail?: string;
  people?: string[];
  organizations?: string[];
  wiki?: string;
};
const records: Seed[] = [
  {
    slug: "apollo-11-lunar-landing",
    title: "Humanity arrives on the Moon",
    description:
      "Apollo 11’s Eagle lands in the Sea of Tranquility. Neil Armstrong and Buzz Aldrin become the first people to reach the lunar surface, while Michael Collins remains in orbit.",
    date: "1969-07-20",
    category: "SPACE",
    source: "NASA",
    url: "https://www.nasa.gov/mission/apollo-11/",
    wiki: "Apollo_11",
    locations: [
      { name: "Sea of Tranquility, Moon", region: "World" },
      {
        name: "Mission Control, Houston",
        city: "Houston",
        country: "United States",
        region: "North America",
        latitude: 29.558,
        longitude: -95.089,
      },
    ],
    people: ["Neil Armstrong", "Buzz Aldrin", "Michael Collins"],
    organizations: ["NASA"],
    detail:
      "The landing occurred at 20:17 UTC on July 20. Armstrong’s first step was at 02:56 UTC on July 21 (the evening of July 20 in the United States). This entry dates the landing, not the first step. The Moon is not assigned an Earth country or terrestrial coordinates.",
  },
  {
    slug: "1969-tour-de-france",
    title: "Eddy Merckx wins his first Tour de France",
    description:
      "The Belgian rider completes the Tour in Paris, winning the overall, points and mountains classifications in the same race.",
    date: "1969-07-20",
    category: "SPORTS",
    source: "Tour de France historical archive",
    url: "https://www.letour.fr/en/history",
    wiki: "1969_Tour_de_France",
    locations: [
      {
        name: "Paris",
        city: "Paris",
        country: "France",
        region: "Europe",
        latitude: 48.857,
        longitude: 2.352,
      },
    ],
    people: ["Eddy Merckx"],
    detail:
      "The 1969 edition ran from June 28 to July 20. This entry marks the finish; the race’s earlier stages are not represented as events on this date.",
  },
  {
    slug: "nigerian-civil-war",
    title: "The Nigerian Civil War continues",
    description:
      "Nigeria and the secessionist Republic of Biafra remain at war. The conflict and severe humanitarian crisis form part of the wider world beyond the lunar landing.",
    date: "1967-07-06",
    end: "1970-01-15",
    category: "WAR_CONFLICT",
    source: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/event/Nigerian-civil-war",
    wiki: "Nigerian_Civil_War",
    locations: [{ name: "Southeastern Nigeria", country: "Nigeria", region: "Africa" }],
    detail:
      "Ongoing historical context: this record represents the conflict’s date range. It makes no claim that a particular battle or humanitarian development occurred on every day in that range.",
  },
  {
    slug: "expo-67",
    title: "Expo 67 welcomes the world to Montreal",
    description:
      "The international exposition is open in Montreal, bringing national pavilions and experimental architecture to the islands of the Saint Lawrence River.",
    date: "1967-04-28",
    end: "1967-10-29",
    category: "CULTURE",
    source: "The Canadian Encyclopedia",
    url: "https://www.thecanadianencyclopedia.ca/en/article/expo-67",
    wiki: "Expo_67",
    locations: [{ name: "Montreal", city: "Montreal", country: "Canada", region: "North America" }],
  },
  {
    slug: "berlin-wall-opens",
    title: "The Berlin Wall opens",
    description:
      "After an unexpected announcement about travel rules, crowds gather at East Berlin’s border crossings. Guards open the barriers, allowing people to pass into West Berlin.",
    date: "1989-11-09",
    category: "POLITICS",
    source: "Berlin Wall Foundation",
    url: "https://www.stiftung-berliner-mauer.de/en/topics/the-berlin-wall",
    wiki: "Fall_of_the_Berlin_Wall",
    locations: [
      {
        name: "Berlin",
        city: "Berlin",
        country: "East Germany / West Berlin",
        region: "Europe",
        latitude: 52.52,
        longitude: 13.405,
      },
    ],
    people: ["Günter Schabowski"],
    detail:
      "The opening of the border was a decisive moment in the collapse of East Germany’s border regime. German reunification followed on October 3, 1990; it did not occur on this day.",
  },
  {
    slug: "deng-military-commission-resignation",
    title: "Deng Xiaoping leaves his party military post",
    description:
      "Deng relinquishes leadership of the Communist Party’s Central Military Commission. Jiang Zemin succeeds him.",
    date: "1989-11-09",
    category: "POLITICS",
    source: "Contemporary press reporting",
    url: "https://www.deseret.com/1989/11/9/18831573/deng-quits-a-final-post-head-of-military-panel/",
    wiki: "Deng_Xiaoping",
    locations: [{ name: "Beijing", city: "Beijing", country: "China", region: "Asia" }],
    people: ["Deng Xiaoping", "Jiang Zemin"],
    detail:
      "This entry concerns the party commission. Deng retained the chairmanship of the separate state Central Military Commission until 1990.",
  },
  {
    slug: "namibia-1989-election",
    title: "Namibians vote in a landmark election",
    description:
      "Voting is underway for a constituent assembly under United Nations supervision, a major step toward Namibia’s independence.",
    date: "1989-11-07",
    end: "1989-11-11",
    category: "POLITICS",
    source: "United Nations peacekeeping",
    url: "https://peacekeeping.un.org/en/mission/past/untag.htm",
    wiki: "1989_Namibian_parliamentary_election",
    locations: [{ name: "Namibia", country: "Namibia (before independence)", region: "Africa" }],
    organizations: ["United Nations"],
    detail:
      "Voting took place November 7–11. This is an ongoing election window, not a claim about a specific result on November 9. Namibia became independent on March 21, 1990.",
  },
  {
    slug: "september-11-attacks",
    title: "September 11 attacks in the United States",
    description:
      "Al-Qaeda hijackers attack the World Trade Center and the Pentagon. A fourth hijacked aircraft crashes in Pennsylvania after passengers and crew resist.",
    date: "2001-09-11",
    category: "WAR_CONFLICT",
    source: "9/11 Memorial & Museum",
    url: "https://www.911memorial.org/911-faqs",
    wiki: "September_11_attacks",
    locations: [
      {
        name: "New York City",
        city: "New York",
        country: "United States",
        region: "North America",
        latitude: 40.712,
        longitude: -74.013,
      },
      { name: "Arlington, Virginia", country: "United States", region: "North America" },
      { name: "Shanksville, Pennsylvania", country: "United States", region: "North America" },
    ],
    detail:
      "The attacks killed 2,977 victims. This summary is intentionally non-graphic; the linked museum provides historical context and remembrance resources.",
  },
  {
    slug: "inter-american-democratic-charter",
    title: "The Americas adopt a democratic charter",
    description:
      "Meeting in Lima, the Organization of American States adopts the Inter-American Democratic Charter by acclamation, affirming a regional commitment to representative democracy.",
    date: "2001-09-11",
    category: "POLITICS",
    source: "Organization of American States",
    url: "https://www.oas.org/charter/docs/comuni_eng/E_003.htm",
    wiki: "Inter-American_Democratic_Charter",
    locations: [
      {
        name: "Lima",
        city: "Lima",
        country: "Peru",
        region: "South America",
        latitude: -12.046,
        longitude: -77.043,
      },
    ],
    organizations: ["Organization of American States"],
  },
  {
    slug: "iss-expedition-3",
    title: "The International Space Station’s third expedition is in orbit",
    description:
      "Expedition 3 is living and working aboard the International Space Station, with an international crew conducting station operations and research.",
    date: "2001-08-12",
    end: "2001-12-15",
    category: "SPACE",
    source: "NASA",
    url: "https://www.nasa.gov/mission/expedition-3/",
    wiki: "Expedition_3",
    locations: [{ name: "Low Earth orbit", region: "World" }],
    people: ["Frank Culbertson", "Vladimir Dezhurov", "Mikhail Tyurin"],
    organizations: ["NASA"],
    detail:
      "Ongoing mission context. Expedition 3’s station residency spanned August to December 2001. This record does not assert that any particular experiment happened on the selected date.",
  },
  {
    slug: "india-independence",
    title: "India becomes independent",
    description:
      "British rule ends and the independent Dominion of India comes into being. Jawaharlal Nehru becomes its first prime minister as partition reshapes the subcontinent.",
    date: "1947-08-15",
    category: "POLITICS",
    source: "UK Parliament",
    url: "https://www.parliament.uk/about/living-heritage/evolutionofparliament/legislativescrutiny/parliament-and-india/collections1/collections2/indian-independence-act-1947/",
    wiki: "Indian_Independence_Act_1947",
    locations: [
      {
        name: "New Delhi",
        city: "New Delhi",
        country: "India",
        region: "Asia",
        latitude: 28.614,
        longitude: 77.209,
      },
    ],
    people: ["Jawaharlal Nehru"],
    detail:
      "Independence was accompanied by partition, mass displacement and communal violence. Pakistan commemorates its independence on August 14. TimeLens preserves those distinct commemorative dates rather than collapsing them.",
  },
  {
    slug: "1947-geneva-trade-negotiations",
    title: "A new trading order takes shape in Geneva",
    description:
      "Delegates are negotiating trade rules and tariff reductions in Geneva. The talks will lead to the General Agreement on Tariffs and Trade later in the year.",
    date: "1947-04-10",
    end: "1947-10-30",
    category: "ECONOMY",
    source: "World Trade Organization historical archive",
    url: "https://www.wto.org/english/res_e/booksp_e/gatt_ai_e/intro_e.pdf",
    wiki: "General_Agreement_on_Tariffs_and_Trade",
    locations: [{ name: "Geneva", city: "Geneva", country: "Switzerland", region: "Europe" }],
    detail:
      "Ongoing negotiation context. The second session of the preparatory committee ran from April 10 to October 30, 1947. This entry does not claim an agreement was signed on August 15; the final act was signed on October 30.",
  },
  {
    slug: "indonesian-national-revolution",
    title: "Indonesia’s struggle for independence continues",
    description:
      "The Indonesian National Revolution is ongoing, as the republic proclaimed in 1945 contests the restoration of Dutch colonial rule.",
    date: "1945-08-17",
    end: "1949-12-27",
    category: "WAR_CONFLICT",
    source: "Encyclopaedia Britannica",
    url: "https://www.britannica.com/place/Indonesia/Independence-and-the-struggle-for-power",
    wiki: "Indonesian_National_Revolution",
    locations: [
      {
        name: "Indonesian archipelago",
        country: "Indonesia (independence contested)",
        region: "Asia",
      },
    ],
    detail:
      "This range is broad context. It ends with the Dutch transfer of sovereignty in December 1949; it is not a day-by-day record of hostilities.",
  },
  {
    slug: "world-welcomes-2000",
    title: "The world welcomes the year 2000",
    description:
      "Public celebrations follow midnight across time zones as the calendar turns to 2000. The date becomes a worldwide cultural milestone.",
    date: "2000-01-01",
    category: "SOCIETY",
    source: "Royal Museums Greenwich",
    url: "https://www.rmg.co.uk/stories/time/when-did-new-millennium-start",
    wiki: "Millennium_celebrations",
    locations: [
      { name: "Worldwide", region: "World" },
      { name: "Sydney", city: "Sydney", country: "Australia", region: "Oceania" },
    ],
    detail:
      "Popular millennium celebrations centered on January 1, 2000. In the Gregorian calendar, which has no year zero, the third millennium technically began on January 1, 2001.",
  },
  {
    slug: "y2k-rollover",
    title: "Computer systems pass the Y2K rollover",
    description:
      "After extensive remediation and preparation, the change to the year 2000 brings far fewer computer disruptions than many had feared.",
    date: "2000-01-01",
    category: "TECHNOLOGY",
    source: "US Government Accountability Office",
    url: "https://www.gao.gov/products/aimd-00-290",
    wiki: "Year_2000_problem",
    locations: [{ name: "Worldwide", region: "World" }],
    detail:
      "The Y2K problem came from systems storing years with two digits. The relatively smooth transition followed substantial testing and repair work; it does not mean the underlying risk was imaginary.",
  },
  {
    slug: "panama-canal-first-full-day",
    title: "A new year under Panamanian canal control",
    description:
      "Panama begins the first full calendar day of sole control of the Panama Canal, following the formal transfer at noon on December 31, 1999.",
    date: "2000-01-01",
    category: "POLITICS",
    source: "Panama Canal Authority",
    url: "https://pancanal.com/en/history-of-the-panama-canal/",
    wiki: "Panama_Canal",
    locations: [
      {
        name: "Panama Canal",
        country: "Panama",
        region: "North America",
        latitude: 9.08,
        longitude: -79.68,
      },
    ],
    detail:
      "The handover occurred on December 31, not January 1. This entry explicitly describes the first full day afterward. Central America is included in the North America filter.",
  },
];
export const seedEvents: HistoricalEvent[] = records.map((r) =>
  normalizeEvent({
    slug: r.slug,
    title: r.title,
    shortDescription: r.description,
    fullDescription: r.detail,
    startDate: r.date,
    endDate: r.end,
    category: r.category,
    sourceName: `TimeLens seed · ${r.source}`,
    sourceUrl: r.url,
    wikipediaUrl: r.wiki ? `https://en.wikipedia.org/wiki/${r.wiki}` : undefined,
    locations: r.locations,
    people: (r.people ?? []).map((name) => ({ name })),
    organizations: (r.organizations ?? []).map((name) => ({ name })),
  }),
);
export const exampleDates = [
  {
    date: "1969-07-20",
    label: "Moon landing",
    note: "A new perspective on Earth",
    category: "SPACE",
  },
  {
    date: "1989-11-09",
    label: "The Berlin Wall opens",
    note: "A border opens. An era turns.",
    category: "POLITICS",
  },
  {
    date: "1947-08-15",
    label: "Indian independence",
    note: "The subcontinent at a turning point",
    category: "POLITICS",
  },
  {
    date: "2000-01-01",
    label: "A new millennium",
    note: "The world turns the calendar",
    category: "SOCIETY",
  },
];
