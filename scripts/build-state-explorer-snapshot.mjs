/**
 * Builds src/data/state-explorer-snapshot.json from JHU's expanded raw-data
 * workbook (sent 2026-10-02, outside the repo — see SOURCE_PATH). Not a live
 * API fetch like the Enrollment/Regulation scripts: this is a one-off manual
 * .xlsx drop, no stable Drive/Sheet id, so just read it off disk by hand
 * whenever JHU sends a new one. Update SOURCE_PATH to match.
 *
 * The "raw data" sheet is long-format: one row per state x local unit
 * (county/district/town/LEA — varies by state) x school year, ~78k rows,
 * 1984-2025. Which unit a state reports by, and how fine its demographics
 * get, is genuinely per-state (the geography-standardization problem already
 * flagged for JHU — STATUS.md's Phase 2 section). shapeState() and the
 * demographic extractors below are shared across every state; each state
 * still needs its own one-line config (which column holds its unit name)
 * and, only for a real map, its own name-normalization function.
 *
 * Two tiers:
 *  - MAP_MATCHED: has a real boundary file (public/state-explorer-geo/) and a
 *    name-normalization function joining the workbook's raw names to it.
 *    GA and LA only — the two boundary files built so far.
 *  - LIST_ONLY: no boundary file. Renders as a real ranked list, no map,
 *    same as Hawaii's hand-entered card. Adding one is a single config line.
 * Moving a state from LIST_ONLY to MAP_MATCHED later = build its geo file +
 * write its mapName(), nothing else changes.
 *
 * Run locally:
 *   node scripts/build-state-explorer-snapshot.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as XLSX from "xlsx";
import { writeSnapshot } from "./lib/sheets.mjs";
import { STATES } from "../src/config/states.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SOURCE_PATH = resolve(
  HERE,
  "../../notes/2026-10-27-combined-state-data-from-jhu-corrected.xlsx",
);
export const OUT_PATH = resolve(HERE, "../src/data/state-explorer-snapshot.json");
const GEO_DIR = resolve(HERE, "../public/state-explorer-geo");
const LA_GEO_PATH = resolve(GEO_DIR, "la-districts.json");

export const NAME_BY_POSTAL = Object.fromEntries(STATES.map((s) => [s.postal, s.name]));

// School-year label matching the rest of the app's convention (e.g. 2024 ->
// "2024–25") so merged regions key identically to the hand-entered years
// already in stateExplorerMockData.js.
export function yearLabel(fallYear) {
  return `${fallYear}–${String(fallYear + 1).slice(-2)}`;
}

function plural(unit) {
  return unit === "county" ? "counties" : `${unit}s`;
}

// us-atlas/TIGER geometry names, read straight out of the committed topojson
// rather than hardcoded, so this stays correct if the geo files ever change.
export function geoNames(path) {
  const topo = JSON.parse(readFileSync(path, "utf8"));
  const obj = Object.values(topo.objects)[0];
  return new Set(obj.geometries.map((g) => g.properties.name));
}

// Louisiana: raw names are bare parish names, "Saint X", or one of 5
// independent-district names — normalized to match the TIGER geometry's form
// ("X Parish" / "St. X Parish" / the independent district's own name). Found
// by diffing the raw workbook's 69 names against the geometry's 69 names
// directly; these 4 are the only real-world exceptions.
const LA_SPECIAL_CASES = {
  "Baker Community": "Baker City",
  DeSoto: "De Soto Parish",
  LaSalle: "La Salle Parish",
  "Saint John": "St. John the Baptist Parish",
};
const LA_ALREADY_EXACT = new Set([
  "Bogalusa City",
  "Central Community",
  "Monroe City",
  "Zachary Community",
]);
function mapLaName(raw) {
  if (LA_SPECIAL_CASES[raw]) return LA_SPECIAL_CASES[raw];
  if (LA_ALREADY_EXACT.has(raw)) return raw;
  if (raw.startsWith("Saint ")) return `St.${raw.slice(5)} Parish`;
  return `${raw} Parish`;
}

// County boundaries for these 9 states come straight from `us-atlas`
// (already a project devDependency — zero network fetch, build-time only),
// pruned per state with `mapshaper` the same way as everyone else's TIGER
// files, e.g.:
//   npx mapshaper -i node_modules/us-atlas/counties-10m.json id-field=fips \
//     -filter "fips && String(fips).padStart(5,'0').slice(0,2) == '12'" \
//     target=counties -o public/state-explorer-geo/fl-counties.json \
//     format=topojson id-field=fips
// (FIPS codes from src/config/states.js). Raw county names mostly need only
// the usual " County" strip, but real workbook data has real-world noise —
// case differences ("Mchenry" vs "McHenry"), "St"/"Saint" spelling, "&" vs
// "and", truncated names (Nebraska's column has a length limit — "Hamilto"
// for "Hamilton"), and a handful of outright typos. buildCountyMapper below
// handles the first three generically (case-insensitive + a normalized-key
// lookup) and falls back to a unique-prefix match for truncation; TYPO_FIXES
// covers the rest, found by diffing each state's full raw name list against
// its geometry's name list, same method as LA's 4 exceptions below.
function countyNormKey(s) {
  return s
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/&/g, "and")
    .replace(/^st\b/, "saint")
    .replace(/\s+/g, " ")
    .trim();
}
const TYPO_FIXES = {
  MD: { Worchester: "Worcester" },
  WA: { Liew: "Lewis", "Garys Harbor": "Grays Harbor" },
  // Florida's column carries a leading "NN " county-code prefix, and uses
  // the pre-1997 name "Dade" (now Miami-Dade) in its older rows.
  FL: { Dade: "Miami-Dade" },
};
function buildCountyMapper(geoPath, state) {
  const names = [...geoNames(geoPath)];
  const byKey = new Map(names.map((n) => [countyNormKey(n), n]));
  const fixes = TYPO_FIXES[state] ?? {};
  return function mapCountyName(raw) {
    let cleaned = raw.replace(/^\d+\s+/, "").replace(/\s+County$/i, "").trim();
    cleaned = fixes[cleaned] ?? cleaned;
    const key = countyNormKey(cleaned);
    if (byKey.has(key)) return byKey.get(key);
    const prefixMatches = [...byKey.keys()].filter((k) => k.startsWith(key));
    return prefixMatches.length === 1 ? byKey.get(prefixMatches[0]) : cleaned;
  };
}

// Maryland's real "Baltimore City" (FIPS 24510) and "Baltimore County" (FIPS
// 24005) are two different real places, but us-atlas's source data names
// them BOTH "Baltimore" — the build command above renames 24510 to
// "Baltimore City" (`-each "if (fips === '24510') name = 'Baltimore City'"`)
// so they don't collide; the committed geo file already has that fix baked
// in, nothing to redo here.

function countyGeoPath(abbr) {
  return resolve(GEO_DIR, `${abbr}-counties.json`);
}

// School-district (and MA's towns) boundaries for 12 states — real per-state
// Census TIGER downloads (Unified/Elementary/Secondary School District
// products, or County Subdivisions for MA's towns), combined+pruned+
// simplified with mapshaper the same way as the county states above, e.g.:
//   npx mapshaper -i tl_2023_47_unsd.zip tl_2023_47_elsd.zip \
//     tl_2023_47_scsd.zip combine-files -filter-fields GEOID,NAME,STATEFP \
//     "target=*" -merge-layers target=tl_2023_47_unsd,tl_2023_47_elsd,\
//     tl_2023_47_scsd -simplify 8% keep-shapes \
//     -o public/state-explorer-geo/tn-districts.json format=topojson \
//     id-field=GEOID
// (FIPS codes from src/config/states.js; some states only have a UNSD file,
// no ELSD/SCSD — Census 404s those, skip them.) Several of these downloads
// included a Census placeholder feature for area (usually water/federal
// land) not assigned to any real district/town — "School District Not
// Defined" in 8 of the 12 district states (NH/NY/PA/RI/SC/TN/WI/WY; CO/NM/SD
// didn't have it), "County subdivisions not defined" (x6, one per coastal
// county) in MA's COUSUB-based towns file. Not a real selectable place,
// unlike a real-but-unmatched name (e.g. Georgia's 3 real counties with no
// reported data) — stripped out of the committed geo files directly (filter
// any `properties.name` matching /not defined/i out of the topojson
// object's `geometries` array). Filter it at the mapshaper step for any
// future state built this way (NAME doesn't support regex in mapshaper's
// `-filter`, so match the exact string(s) seen so far instead), e.g. add
// `-filter 'NAME != "School District Not Defined"'` before `-merge-layers`,
// rather than post-processing the output. TN specifically also needs one
// more follow-up step after a fresh rebuild: `node
// scripts/merge-tn-enclave-districts.mjs` — this TIGER product splits a
// handful of TN districts' secondary-only zone into a separate "<Base> in
// <City>" polygon where it falls inside a town with its own K-8 city
// district (real, different administrative zones, not duplicates — see that
// script's own header comment and decisions.md 2026-10-07), which JHU's raw
// data never reports separately from the parent county.
// Workbook names are far
// noisier against real district names than county names ever were — every
// kind of abbreviation (SD/Sch Dist/CSD/SSD/UHS/Co.), spelled-out vs.
// shorthand numbering ("District One" vs "1", "29J" vs "29-J"), and (for
// Wisconsin specifically) the same fixed-length-column truncation Nebraska's
// counties had. districtNormKey below handles all of that generically;
// `allowPrefix` turns on the truncation fallback where needed. Found and
// tuned by diffing each state's full raw name list against its real
// geometry's name list, same method as the county states — see decisions.md
// (2026-10-06, boundary files for the remaining list-only states).
export function districtNormKey(raw) {
  const WORD_NUM = {
    one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  };
  let s = raw.toLowerCase();
  // Fold accented Latin letters to their base form (e.g. "ñ" -> "n") BEFORE
  // the non-letter strip below — that strip treats "ñ" as punctuation and
  // deletes it outright (leaving a stray space, splitting one word into
  // two), rather than treating it as the "n" it stands for. Found via New
  // Mexico's "Española"/"Peñasco" real districts not matching their own
  // unaccented raw-data spellings ("Espanola"/"Penasco") — 2026-10-12.
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/\(non-op\)/g, " ");
  s = s.replace(/[.#]/g, " ");
  s = s.replace(/\bco\b/g, "county");
  s = s.replace(/\bmt\b/g, "mount");
  s = s.replace(/\bst\b/g, "saint");
  s = s.replace(/\bplt\b/g, "plantation");
  s = s.replace(/\bhbr\b/g, "harbor");
  s = s.replace(/&/g, "and");
  s = s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g, (m) => WORD_NUM[m]);
  s = s.replace(/\bno\b/g, " ");
  s = s.replace(/\bj(\d)/g, "$1");
  // strip standalone procedural/governance-type noise words — not county/
  // city, which still distinguish real entities within a state's own list
  s = s.replace(
    /\b(school|schools|sch|district|dist|sd|csd|usd|isd|ssd|uhs|unified|public|municipal|independent|consolidated|regional|cooperative|coop|community|town|city|county|the|of|union|high|joint|special|elementary|system|area)\b/g,
    " ",
  );
  s = s.replace(/[^a-z0-9 ]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  // collapse digit<->single-letter adjacency noise (e.g. "29 j" / "29-j")
  s = s.replace(/(\d) ([a-z])\b/g, "$1$2");
  s = s.replace(/\b([a-z]) (\d)/g, "$1$2");
  return s;
}
// New York City's raw rows use NYC DOE's own internal numbering ("NEW YORK
// CITY GEOGRAPHIC DISTRICT #1" .. "#32") for its 32 community districts —
// an NYC-internal administrative scheme with no federal TIGER equivalent;
// Census treats the whole city as ONE unified school district. Collapsing
// all 32 raw names onto that single real name lets the existing SUM-not-
// overwrite logic in shapeState (built for Washington's county-contains-
// many-districts case) combine them into one real NYC region instead of
// 32 silently-dropped names — the single biggest chunk of NY's gap.
// A second, older ALL-CAPS raw naming convention runs alongside NY's normal
// title-case rows (different reporting years/source, not resolved by case-
// folding since districtNormKey already lowercases everything) — these are
// real renames/mergers/parenthetical-alias mismatches, confirmed per-name
// the same way as every other state's special cases, 2026-10-12:
//   - Central Valley Central School District is the real 2010s merger of
//     Ilion and Mohawk (both raw spellings, plus the newer combined one, map
//     to it).
//   - Boquet Valley Central School District at Elizabethtown-Lewis-Westport
//     is the real merger of Westport and Elizabethtown-Lewis.
//   - Oppenheim-Ephratah-St. Johnsville Central School District is the real
//     merger of Oppenheim-Ephratah and St. Johnsville.
//   - The rest are real districts whose TIGER name carries a parenthetical
//     alias (e.g. "(North Rockland)") the raw ALL-CAPS spelling doesn't
//     reproduce, or just the "CSD" abbreviation losing "Central" the same
//     way districtNormKey's stopword list already strips it for the
//     unabbreviated form — direct 1:1, not a merger.
const NY_SPECIAL_CASES = {
  "THE ENLARGED CITY SCHOOL DISTRICT OF THE CITY OF SARATOGA SPRINGS":
    "Saratoga Springs City School District",
  "NORTH COLONIE CSD": "North Colonie Central School District",
  "KINDERHOOK CENTRAL SCHOOL DISTRICT": "Kinderhook Central School District (Ichabod Crane)",
  "CANISTEO-GREENWOOD CSD": "Canisteo-Greenwood Central School District",
  "CENTRAL VALLEY CSD AT ILION-MOHAWK": "Central Valley Central School District",
  "ILION CENTRAL SCHOOL DISTRICT": "Central Valley Central School District",
  "MOHAWK CENTRAL SCHOOL DISTRICT": "Central Valley Central School District",
  "OPPENHEIM-EPHRATAH-ST. JOHNSVILLE CSD":
    "Oppenheim-Ephratah-St. Johnsville Central School District",
  "SAINT JOHNSVILLE CENTRAL SCHOOL DISTRICT":
    "Oppenheim-Ephratah-St. Johnsville Central School District",
  "OPPENHEIM-EPHRATAH CENTRAL SCHOOL DISTRICT":
    "Oppenheim-Ephratah-St. Johnsville Central School District",
  "EASTPORT-SOUTH MANOR CSD": "Eastport-South Manor Central School District",
  "HAVERSTRAW-STONY POINT CSD (NORTH ROCKLAND)":
    "Haverstraw-Stony Point Central School District (North Rockland)",
  "MANCHESTER-SHORTSVILLE CENTRAL SCHOOL DISTRICT (RED JACKET)":
    "Manchester-Shortsville Central School District",
  "OTSELIC VALLEY CENTRAL SCHOOL DISTRICT AT GEORGETOWN-SOUTH OTSELIC":
    "Georgetown-South Otselic Central School District",
  "VALLEY STREAM 13 UNION FREE SCHOOL DISTRICT": "Valley Stream Union Free School District 13",
  "VALLEY STREAM 24 UNION FREE SCHOOL DISTRICT": "Valley Stream Union Free School District 24",
  "VALLEY STREAM 30 UNION FREE SCHOOL DISTRICT": "Valley Stream Union Free School District 30",
  "WESTPORT CENTRAL SCHOOL DISTRICT":
    "Boquet Valley Central School District at Elizabethtown-Lewis-Westport",
  "ELIZABETHTOWN-LEWIS CENTRAL SCHOOL DISTRICT":
    "Boquet Valley Central School District at Elizabethtown-Lewis-Westport",
};
const NY_PREPROCESS = (raw) => {
  if (/^NEW YORK CITY GEOGRAPHIC DISTRICT/i.test(raw)) return "New York City Department Of Education";
  return NY_SPECIAL_CASES[raw] ?? raw;
};

// Nashville and Clarksville (and Jackson/Madison, a city-county pair with
// the same consolidated shape) don't have real TIGER school-district names
// that contain "Davidson"/"Montgomery"/"Madison" alone — not an abbreviation
// issue districtNormKey can generalize, just real, different legal names
// worth hardcoding (same shape as Louisiana's special cases above). Each has
// a 2013–2016 raw spelling ("Davidson County") and a 2017+ one ("Davidson
// Co.") — both mapped; found by extending the region-sum audit to check
// every year, not just each state's latest (2026-10-12), which is what
// first surfaced the 2013–2016 rows as a real gap.
//
// Franklin/Johnson/Union are a different problem: TN genuinely has two real
// districts sharing each base name (a County district and a City/Special
// district), and districtNormKey's stopword stripping collapses both raw
// names AND both real geo names to the same key ("franklin"/"johnson"/
// "union" — "county"/"city"/"special" are all stopwords). Found via
// buildDistrictMapper's new collision guard below: Franklin's "losing" side
// (whichever geo name didn't win the ambiguous key) was silently showing no
// data at all — reported live by Roy for Franklin specifically; Johnson/
// Union have the identical shape, caught by generalizing the fix rather than
// patching Franklin alone. All six raw spellings are stable and distinct
// across every year 2013–2024 (no ambiguous bare "Franklin"-only row the way
// PA has — see PA's own unfixed collisions below), so a straight raw-string
// map resolves all three cleanly.
const TN_SPECIAL_CASES = {
  "Montgomery Co.": "Clarksville-Montgomery County School System",
  "Montgomery County": "Clarksville-Montgomery County School System", // 2013–2016 spelling
  "Davidson Co.": "Metropolitan Nashville Public School District",
  "Davidson County": "Metropolitan Nashville Public School District", // 2013–2016 spelling
  "Madison County": "Jackson-Madison County School System", // 2013–2016 spelling; "Jackson-Madison Co." (2017+) already normalizes fine
  "Franklin County": "Franklin County School District", // 2013–2016 spelling
  "Franklin Co.": "Franklin County School District", // 2017+ spelling
  "Franklin Special": "Franklin Special School District", // 2013–2016 spelling
  "Franklin SSD": "Franklin Special School District", // 2017+ spelling
  "Johnson City": "Johnson City School District",
  "Johnson County": "Johnson County School District", // 2013–2016 spelling
  "Johnson Co.": "Johnson County School District", // 2017+ spelling
  "Union City": "Union City School District",
  "Union County": "Union County School District", // 2013–2016 spelling
  "Union Co.": "Union County School District", // 2017+ spelling
};

// New Hampshire's one colliding pair: "Exeter School District" and "Exeter
// Regional Cooperative School District" both reduce to "exeter" (same
// stopword-collision shape as TN above). The raw sheet's second variant is
// spelled "Exeter Region Cooperative" (no trailing "-al"), which doesn't even
// reach the collision — districtNormKey only strips "regional", not
// "region", so it was simply never matching anything at all. Hardcoding both
// raw spellings fixes the collision and the vocabulary gap in one step.
const NH_SPECIAL_CASES = {
  Exeter: "Exeter School District",
  "Exeter Region Cooperative": "Exeter Regional Cooperative School District",
  // Plural-vs-singular, not a rename — the real boundary file's name is
  // "White Mountain" (singular), the raw sheet has always said "White
  // Mountains" (plural), every year 2011-2025.
  "White Mountains Regional": "White Mountain Regional School District",
};

// Pennsylvania's 6 collision pairs (flagged 2026-10-07, unblocked 2026-10-12
// once `district ` — not `lcounty` — turned out to hold clean, stable raw
// district names for 2014–2023; see PA's config below). All raw spellings
// below are stable across every one of those years; found and verified the
// same way as TN/NH's — diffing PA's real per-year `district ` values
// against the real boundary file's names. "Knoch" is a genuine rename, not a
// stopword collision: South Butler County School District renamed itself
// Knoch School District in 2022; the real boundary file (vintage predates
// the rename) still has the old name, and JHU's workbook already uses
// "Knoch" from 2020 on. "Union" is a 3-way collision, not a pair — "union"
// is itself one of districtNormKey's stopwords (for NY's "Union Free School
// District" pattern), so three distinct real PA districts (Union, Union
// Area, Union City Area) all reduce to the same empty key; Mount Union Area
// needs no entry here since its own key ("mount") doesn't collide with
// anything and already matches via the generic normalizer. "River Valley SD"
// (appears from 2020 on) is a second rename, not a collision: Blairsville-
// Saltsburg School District became River Valley School District effective
// 2021-07-01; the real boundary file still has the pre-rename name.
const PA_SPECIAL_CASES = {
  "Hanover Area SD": "Hanover Area School District",
  "Hanover Public SD": "Hanover Public School District",
  "Hempfield  SD": "Hempfield School District", // double-space spelling, 2014-2018
  "Hempfield SD": "Hempfield School District", // single-space spelling, 2019+
  "Hempfield Area SD": "Hempfield Area School District",
  "Union SD": "Union School District",
  "Union Area SD": "Union Area School District",
  "Union City Area SD": "Union City Area School District",
  "Forest Area SD": "Forest Area School District",
  "Forest City Regional SD": "Forest City Regional School District",
  "Franklin Area SD": "Franklin Area School District",
  "Franklin Regional SD": "Franklin Regional School District",
  "Wilson  SD": "Wilson School District", // double-space spelling, 2014-2018
  "Wilson SD": "Wilson School District", // single-space spelling, 2019+
  "Wilson Area SD": "Wilson Area School District",
  "Knoch SD": "South Butler County School District",
  "River Valley SD": "Blairsville-Saltsburg School District",
};

// South Carolina: two real shapes, found 2026-10-12 (the "91.7%, genuine
// ambiguous/non-geographic" framing below predates this — these turned out
// to be real, resolvable consolidations/renames, not noise).
//   - Real 2017-2022 countywide consolidations of several small numbered
//     districts (confirmed per-county, not guessed): Orangeburg (2017),
//     Barnwell 19+29 (2022, Barnwell 45 stayed separate and already matches
//     generically), Clarendon 1+2+3+4 (2022). Every predecessor number maps
//     to the post-merger county district; SUM-not-overwrite in shapeState
//     combines them for years where more than one predecessor reported.
//   - York County's districts are informally/currently known by their town
//     name (Clover = York 2, Fort Mill = York 4) but the boundary file still
//     uses York's own numbering — both the old "York N (Town)" raw spelling
//     AND the newer town-named raw spelling need mapping to the same
//     York-numbered real name.
//   - "Lexington/Richland 5" is the same real district as "Lexington School
//     District 5" under three different raw spellings over time (the real
//     name doesn't mention Richland at all, despite the district serving
//     both counties).
const SC_SPECIAL_CASES = {
  "Barnwell 19": "Barnwell County Consolidated School District",
  "Barnwell 29": "Barnwell County Consolidated School District",
  "Clarendon 1": "Clarendon County School District",
  "Clarendon 2": "Clarendon County School District",
  "Clarendon 3": "Clarendon County School District",
  "Clarendon 4": "Clarendon County School District",
  "York 1 (York)": "York School District 1",
  "York 2 (Clover)": "York School District 2",
  "Clover School District": "York School District 2",
  "York 3 (Rock Hill)": "York School District 3",
  "Rock Hill School District Three of York County": "York School District 3",
  "York 4 (Fort Mill)": "York School District 4",
  "Fort Mill School District": "York School District 4",
  "Fort Mill School District Four": "York School District 4",
  "Lexington/Richland 5": "Lexington School District 5",
  "Lexington/ Richland 5": "Lexington School District 5",
  "School District Five of Lexington and Richland Counties": "Lexington School District 5",
  "Marion 10 District Office": "Marion School District 10",
  "Orangeburg 3": "Orangeburg County School District",
  "Orangeburg 4": "Orangeburg County School District",
  "Orangeburg 5": "Orangeburg County School District",
  "Orangeburg 9": "Orangeburg County School District",
  "Sumter 1": "Sumter County Consolidated School District",
  "Hampton 1": "Hampton County School District",
  "Hampton 2": "Hampton County School District",
  "Hampton 3": "Hampton County School District",
  "Bamberg 1": "Bamberg County School District",
  "Bamberg 2": "Bamberg County School District",
  "Williston 29": "Barnwell County Consolidated School District", // Williston-Elko's own name for Barnwell 29
  "Ware Shoals School District 51": "Greenwood School District 51",
};

// Georgia, rebuilt 2026-10-12 from the real TIGER district-level product
// (UNSD/ELSD/SCSD) instead of us-atlas's county product — Roy caught that
// the district product already has Georgia's ~23 real independent CITY
// school systems (Atlanta, Marietta, Valdosta, etc.) as their own features,
// which the county-only map could never show at all (not a naming gap, a
// structural ceiling — ~20k students/year, invisible under the old county
// build). See decisions.md, 2026-10-12.
//   - The 3 county-wide systems below are real counties co-branded with
//     their largest city in the raw name ("Savannah-Chatham County" = all of
//     Chatham County, not a separate smaller system) — confirmed via each
//     city being the real county seat, not guessed.
//   - Jefferson/Calhoun/Decatur each have a real CITY system and a real
//     COUNTY system sharing the same base name — "city"/"county" are both
//     districtNormKey stopwords, so the generic matcher correctly treats
//     these as ambiguous and drops both; same collision shape already fixed
//     for TN/PA/SC. "City Schools of Decatur" is a later raw spelling for
//     the same real entity as "Decatur City" (2016-17 overlap in the raw
//     data, not two different places).
//   - "Optional (undisclosed)" is excluded via GA's excludeNames below, not
//     here — this map only maps, it doesn't filter.
const GA_SPECIAL_CASES = {
  "Savannah-Chatham County": "Chatham County School District",
  "Griffin-Spalding County": "Spalding County School District",
  "Thomaston-Upson County": "Upson County School District",
  "Jefferson City": "Jefferson City School District",
  "Jefferson County": "Jefferson County School District",
  "Calhoun City": "Calhoun City School District",
  "Calhoun County": "Calhoun County School District",
  "Decatur City": "Decatur City School District",
  "City Schools of Decatur": "Decatur City School District",
  "Decatur County": "Decatur County School District",
};

// South Dakota: most raw names just drop the trailing "NN-N" district code
// the real boundary file keeps — not ambiguous (each has one real geo
// match), just missing the code, so hardcoded directly rather than loosened
// generically (same reasoning as PA's Maple Dale-Indian Hill). A few are
// real 2013-era consolidations (confirmed, not guessed): Viborg + Hurley
// merged 2013 into Viborg Hurley School District 60-6; Corsica + Stickney
// (raw "Stickney 01-2") merged into Corsica-Stickney School District 21-3;
// Shannon County renamed to Oglala Lakota County in 2015 (same district
// number, 65-1, just the county/district's legal name changed). "Cheyenne
// River - BIE" is a federally-run Bureau of Indian Education school
// co-located inside Eagle Butte School District 20-1's boundary, not a
// separate geographic district — excluded below. "Grant-Deuel 25-3"
// (dissolved 2018, no single real successor) and "Oldham-Ramona-Rutland
// 39-6" (a real but brand-new 2023 consolidation, too recent for this
// boundary file's vintage) are left unmapped on purpose, same shape as
// NH's Goshen-Lempster/Pasquaney.
const SD_SPECIAL_CASES = {
  "Groton Area": "Groton Area School District 06-6",
  "Faulkton Area": "Faulkton School District 24-4",
  "Faulkton Area Schools District": "Faulkton School District 24-4",
  Miller: "Miller Area School District 29-4",
  "Highmore-Harrold": "Highmore-Harrold School District 34-2",
  "Colome Consolidated": "Colome Consolidated School District 59-3",
  "Webster Area": "Webster School District 18-5",
  "Hitchcock-Tulare": "Hitchcock-Tulare School District 56-6",
  "Langford Area": "Langford School District 45-5",
  "Viborg 60-5": "Viborg Hurley School District 60-6",
  "Hurley 60-2": "Viborg Hurley School District 60-6",
  "Corsica 21-2": "Corsica-Stickney School District 21-3",
  "Stickney 01-2": "Corsica-Stickney School District 21-3",
  "Shannon County 65-1": "Oglala Lakota County School District 65-1",
};

// New Mexico's remaining 3 (after the accent-fold fix above resolved
// Española/Peñasco generically): "Moriarty-Edgewood" is the district's
// commonly-used name, confirmed also officially called "Moriarty Municipal
// Schools" (the real boundary file's name); "Chama Valley Ind." is a
// truncated 2023+ spelling of an otherwise-clean match; "Mosquero Muncipal
// Schools" is a literal typo in the raw data (missing the "i" in
// "Municipal") that breaks the stopword-based generic match, not a rename.
const NM_SPECIAL_CASES = {
  "Moriarty-Edgewood": "Moriarty Municipal Schools",
  "Moriarty-Edgewood School District": "Moriarty Municipal Schools",
  "Chama Valley Ind.": "Chama Valley Independent Schools",
  "Mosquero Muncipal Schools": "Mosquero Municipal Schools",
};

// Wisconsin: four small districts that no longer exist as their own real
// TIGER entity — they consolidated into a different, still-real district
// at some point in the raw data's history (confirmed against Wisconsin DPI's
// reorganization records and news coverage, not guessed):
//   - Richfield J1 + Friess Lake consolidated into Holy Hill Area School
//     District, effective 2018-19 (last standalone row: 2017-18).
//   - Herman #22 + Neosho J3 + Rubicon J6 consolidated into
//     Herman-Neosho-Rubicon School District, effective 2016-17 (the raw
//     sheet already spells it that way from 2016 on — only the earlier
//     Neosho J3 spelling needs mapping).
//   - "Central/Westosha Uhs" is the same institution as today's "Westosha
//     Central High School District" under its pre-2022-23 name — a rename,
//     not a merger.
// Each has two raw spellings across the sheet's history: unabbreviated
// 2007-09, then an abbreviated "Sch Dist" form 2010 on.
const WI_SPECIAL_CASES = {
  "Richfield J 1": "Holy Hill Area School District",
  "Richfield J1 Sch Dist": "Holy Hill Area School District",
  "Friess Lake": "Holy Hill Area School District",
  "Friess Lake Sch Dist": "Holy Hill Area School District",
  "Neosho J3": "Herman-Neosho-Rubicon School District",
  "Neosho J3 Sch Dist": "Herman-Neosho-Rubicon School District",
  "Central/Westosha Uhs": "Westosha Central High School District",
  "Central/Westosha Uhs Sch Dist": "Westosha Central High School District",
  // Not a consolidation — the generic prefix-truncation fallback (WI's
  // `_allowPrefix`) finds TWO real districts whose normalized key is a
  // prefix of this raw row's key ("maple" from the real "Maple School
  // District", and "maple dale indian hill" from this row's real match),
  // so it backs off as ambiguous rather than picking one. The ambiguity is
  // only against the generic key-prefix check, not a real naming
  // collision — "Maple School District" is a different, distant district
  // (Douglas County) with nothing in common with this raw name beyond the
  // first word. Hardcoded directly rather than loosening the generic
  // fallback, which exists to be conservative for exactly this reason.
  "Maple Dale-Indian Hill Sch Dis": "Maple Dale-Indian Hill School District",
};

// Builds a name -> geo-name map, skipping (not overwriting) any key two
// DIFFERENT real names both reduce to — e.g. TN's "Franklin County School
// District" and "Franklin Special School District" both normalize to
// "franklin". A plain Map silently keeps whichever name got inserted last,
// so the loser never matches anything — exactly the bug Roy caught for
// Franklin. Dropping the key for every colliding name instead means an
// un-special-cased collision falls through to "no match" (visible in the
// audit as a real gap) rather than silently merging two different places'
// data onto one polygon.
function buildAmbiguitySafeKeyMap(names, keyFn) {
  const map = new Map();
  const seenKeys = new Map(); // key -> the name that currently owns it
  for (const name of names) {
    const key = keyFn(name);
    if (map.has(key) && seenKeys.get(key) !== name) {
      map.delete(key); // ambiguous — more than one real name shares this key
      continue;
    }
    map.set(key, name);
    seenKeys.set(key, name);
  }
  return map;
}

function buildDistrictMapper(geoPath, { allowPrefix = false, preprocess } = {}) {
  const names = [...geoNames(geoPath)];
  // Exact match (case/whitespace-insensitive) on the real name itself, before
  // any stopword normalization — the escape hatch a `preprocess` hardcoded
  // to a specific real name needs, since that real name may share its
  // normalized key with another real name (see buildAmbiguitySafeKeyMap).
  const byExact = new Map(names.map((n) => [n.toLowerCase().trim(), n]));
  const byKey = buildAmbiguitySafeKeyMap(names, districtNormKey);
  const byTightKey = buildAmbiguitySafeKeyMap(names, (n) => districtNormKey(n).replace(/\s+/g, ""));
  const keys = [...byKey.keys()];
  return function mapDistrictName(rawInput) {
    // `preprocess` may return one rewritten name or several CANDIDATES, tried
    // in order — needed when the real source itself is ambiguous about which
    // name a raw row currently goes by (Maine's TIGERweb data is a genuine
    // mix: some districts already carry their new "Regional School Unit"
    // name, others are still under their legacy "School Administrative
    // District" name, and there's no way to know which from the raw row
    // alone without just trying both).
    const preprocessed = preprocess ? preprocess(rawInput) : rawInput;
    const candidates = Array.isArray(preprocessed) ? preprocessed : [preprocessed];
    for (const raw of candidates) {
      const exact = byExact.get(raw.toLowerCase().trim());
      if (exact) return exact;
      const key = districtNormKey(raw);
      if (byKey.has(key)) return byKey.get(key);
      const tight = key.replace(/\s+/g, "");
      if (byTightKey.has(tight)) return byTightKey.get(tight);
    }
    if (allowPrefix) {
      // raw is the truncated/dirty side (fixed-length column cuts mid-word,
      // leaving a stray suffix fragment) — geo is clean and shorter, so
      // check geo-is-prefix-of-raw, not the other way around.
      const key = districtNormKey(candidates[0]);
      const prefixMatches = keys.filter((k) => k.length >= 4 && key.startsWith(k));
      if (prefixMatches.length === 1) return byKey.get(prefixMatches[0]);
    }
    return candidates[0];
  };
}
function districtGeoPath(abbr, unit = "districts") {
  return resolve(GEO_DIR, `${abbr}-${unit}.json`);
}


// States with a real published boundary file + a name-normalization function
// to join the workbook's raw unit names to that geometry.
export const MAP_MATCHED = {
  GA: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("ga"),
    _preprocess: (raw) => GA_SPECIAL_CASES[raw] ?? raw,
    // Literal raw spelling, including its real double space — the raw data
    // itself flags this as not corresponding to any place.
    excludeNames: new Set(["Optional  (undisclosed)"]),
  },
  // "RSD" = Recovery School District, a real statewide special district
  // (schools taken over by the state, not tied to a single parish) — not a
  // geographic region, excluded the same way as Hawaii's "Charter" above.
  LA: {
    nameField: "district ",
    geoUnit: "district",
    mapName: mapLaName,
    geoPath: LA_GEO_PATH,
    excludeNames: new Set(["RSD"]),
  },
  AR: { nameField: "lcounty", geoUnit: "county", geoPath: countyGeoPath("ar") },
  FL: { nameField: "lcounty", geoUnit: "county", geoPath: countyGeoPath("fl") },
  MD: { nameField: "lea", geoUnit: "county", geoPath: countyGeoPath("md") },
  MN: { nameField: "lcounty", geoUnit: "county", geoPath: countyGeoPath("mn") },
  MT: { nameField: "lcounty", geoUnit: "county", geoPath: countyGeoPath("mt") },
  ND: { nameField: "lcounty", geoUnit: "county", geoPath: countyGeoPath("nd") },
  NE: { nameField: "lcounty", geoUnit: "county", geoPath: countyGeoPath("ne") },
  OH: { nameField: "lcounty", geoUnit: "county", geoPath: countyGeoPath("oh") },
  WA: { nameField: "lcounty", geoUnit: "county", geoPath: countyGeoPath("wa") },
  // Labeled "district " in the raw column, but its 100 distinct names are
  // North Carolina's actual 100 counties (confirmed against JHU's own
  // tracking sheet, which lists NC's disaggregation category as "County").
  NC: { nameField: "district ", geoUnit: "county", geoPath: countyGeoPath("nc") },
  // Real match rates against each state's actual boundary file, found by
  // diffing the full raw-name list against the geometry's name list (same
  // method as every state above) — all strong (86-100%); the remainder in
  // each case is genuine ambiguous/non-geographic entries (charter
  // academies, special-ed districts, abbreviated codes that drop a
  // distinguishing digit), not a normalization bug. See decisions.md
  // (2026-10-06). SC's own remainder turned out to be real resolvable
  // consolidations/renames instead — see SC_SPECIAL_CASES above, 2026-10-12.
  SC: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("sc"),
    _preprocess: (raw) => SC_SPECIAL_CASES[raw] ?? raw,
  }, // 91.7%, higher with SC_SPECIAL_CASES
  SD: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("sd"),
    _preprocess: (raw) => SD_SPECIAL_CASES[raw] ?? raw,
    excludeNames: new Set(["Cheyenne River - BIE"]),
  }, // 92.6%, higher with SD_SPECIAL_CASES
  NY: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("ny"),
    _preprocess: NY_PREPROCESS,
    // Real NY "special act school districts" — a well-documented legal
    // category serving institutionalized/residential student populations
    // (named after the specific facility, e.g. Hopevale, Little Flower,
    // George Junior Republic), not a geographic area a map region can
    // represent. "NYC SPECIAL SCHOOLS - DISTRICT 75" is NYC's own citywide
    // special-education district, same non-geographic shape. Confirmed via
    // NYSED/the NYS Coalition of Special Act School Districts, not guessed.
    excludeNames: new Set([
      "NYC SPECIAL SCHOOLS - DISTRICT 75",
      "GEORGE JUNIOR REPUBLIC UNION FREE SCHOOL DISTRICT",
      "GREENBURGH ELEVEN UNION FREE SCHOOL DISTRICT",
      "GREENBURGH-GRAHAM UNION FREE SCHOOL DISTRICT",
      "GREENBURGH-NORTH CASTLE UNION FREE SCHOOL DISTRICT",
      "RANDOLPH ACADEMY UNION FREE SCHOOL DISTRICT",
      "HOPEVALE UNION FREE SCHOOL DISTRICT AT HAMBURG",
      "LITTLE FLOWER UNION FREE SCHOOL DISTRICT",
      "HAWTHORNE-CEDAR KNOLLS UNION FREE SCHOOL DISTRICT",
      "MOUNT PLEASANT-COTTAGE UNION FREE SCHOOL DISTRICT",
      "MOUNT PLEASANT-BLYTHEDALE UNION FREE SCHOOL DISTRICT",
      "ABBOTT UNION FREE SCHOOL DISTRICT",
    ]),
  }, // 92.5% before the NYC collapse fix, see decisions.md (2026-10-06)
  // PA's `lcounty` and `district ` columns swapped meaning in 2024-25 only —
  // a data-entry mistake in JHU's 2026-10 batch, flagged to Genny 2026-10-12.
  // She confirmed 2026-10-27 she corrected it at the source (swapped the two
  // columns back for SY2024-25); verified directly against her corrected
  // file — 2024-25 now has 499 distinct `district ` values / 67 distinct
  // `lcounty` values, matching every other year's shape. `excludeYears` (kept
  // 2026-10-12 through -27 to fail safe while the source was still wrong)
  // removed accordingly. See decisions.md, 2026-10-07, 2026-10-12, 2026-10-27.
  PA: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("pa"),
    _preprocess: (raw) => PA_SPECIAL_CASES[raw] ?? raw,
  }, // 97.6% for years with real district-level data, now ~99%+ with PA_SPECIAL_CASES; 2024-25 now included
  // JHU's own tracking sheet flags TN explicitly: "'independent' HS should
  // be the only counts, remove 'church school' and 'totals'" — TN is the
  // only state in the workbook where total_enrollment_ count is actually
  // church_related + independent_hs added together (confirmed: matches for
  // all but 2 of ~900 rows). The real homeschool count is independent_hs
  // alone. See decisions.md, 2026-10-05 ("Genny's tracking sheet" entry).
  TN: {
    nameField: "district ",
    geoUnit: "district",
    countField: "independent_hs",
    geoPath: districtGeoPath("tn"),
    _preprocess: (raw) => TN_SPECIAL_CASES[raw] ?? raw,
    // The Achievement School District is a real statewide special district
    // (low-performing schools taken over by the state), not tied to one
    // county — not a geographic region, same shape as LA's "RSD" above.
    excludeNames: new Set(["Achievement School District (ASD)"]),
  }, // 97.9% before the Nashville/Clarksville fix, see decisions.md (2026-10-06)
  CO: { nameField: "district ", geoUnit: "district", geoPath: districtGeoPath("co") }, // 86.0%
  // These 3 are real charter schools, not geographic districts — they draw
  // students from across a wide area rather than belonging to any one real
  // district polygon.
  WY: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("wy"),
    excludeNames: new Set([
      "Cheyenne Classical Academy",
      "Wyoming Classical Academy",
      "Prairie View Community School",
    ]),
  }, // 94.1%
  RI: { nameField: "district ", geoUnit: "district", geoPath: districtGeoPath("ri") }, // 100%
  MA: {
    nameField: "town ",
    geoUnit: "town",
    geoPath: districtGeoPath("ma", "towns"),
    // Manchester officially renamed itself Manchester-by-the-Sea in 1989;
    // the real boundary file uses the post-rename name.
    _preprocess: (raw) => (raw === "Manchester (non-op)" ? "Manchester-by-the-Sea" : raw),
    // Devens is a real place but not an incorporated town — a state-run
    // "regional enterprise zone" split across Ayer/Harvard/Shirley with no
    // town government or single polygon of its own, so there's no real name
    // to map it to (not a naming puzzle like Manchester above). "State"/
    // "State Total" are MA's real grand-total row (see TOTAL_SENTINELS
    // above, which now prefers it for the real yearTotal) — excluded here
    // too so the region-matching loop doesn't separately try and fail to
    // match it against a town.
    excludeNames: new Set(["Devens (non-op)", "State", "State Total"]),
  }, // 99.4%
  NH: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("nh"),
    _preprocess: (raw) => NH_SPECIAL_CASES[raw] ?? raw,
    // "SAU #23 French Pond"/"King Street School" are individual SCHOOL
    // buildings, not districts — a one-year (2022), zero-value data
    // artifact, not a real geographic region. "Goshen-Lempster Cooperative"
    // (2011-2015 only) and "Pasquaney" (2025 only) are real but genuinely
    // unmappable, not naming puzzles: Goshen-Lempster split into two
    // separate real districts (Goshen, Lempster) in 2015 — no single
    // current polygon is "correct" for its pre-split history, and
    // attributing it to either one alone, or both, would misstate what that
    // row actually reported. Pasquaney is a brand-new district (formed July
    // 2025, split off from Newfound Area) — too new for the boundary file's
    // vintage to have a polygon for yet. Left unmatched on purpose.
    excludeNames: new Set(["SAU #23 French Pond", "SAU #23 King Street School"]),
  }, // 98.2%
  // NM's 2020 rows carry the richest statewide demographics in the whole
  // workbook (full K-12 grade, 3-way gender, 7-way race — checked against
  // its own total, all three sum close to it) but its real district rows
  // stop reporting demographics after that year, same situation as Hawaii's
  // hand-entered card — pin the whole card to 2020 rather than show a newer,
  // demographic-less total next to an older breakdown.
  NM: {
    nameField: "district ",
    geoUnit: "district",
    pinnedYear: 2020,
    geoPath: districtGeoPath("nm"),
    _preprocess: (raw) => NM_SPECIAL_CASES[raw] ?? raw,
  }, // 95.5%, higher with the accent-fold fix + NM_SPECIAL_CASES
  // Wisconsin's raw column truncates to a fixed length (same issue Nebraska's
  // counties had) — the generic mapper's prefix-match fallback handles it.
  // WI_SPECIAL_CASES above handles the real consolidations/renames and the
  // one ambiguous-prefix name the fallback can't.
  WI: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("wi"),
    _allowPrefix: true,
    _preprocess: (raw) => WI_SPECIAL_CASES[raw] ?? raw,
  }, // 99.3%
  // Maine's raw rows mostly match real TIGER names directly (single-town
  // units like "Acton Public Schools" -> "Acton"). The real gap is Maine's
  // modern "RSU NN" (Regional School Unit) numbering, which the STATIC
  // TIGER2023 bulk download (used for every other state) doesn't know at
  // all — that vintage still has Maine's pre-2007-consolidation "School
  // Administrative District NN" names exclusively. But the live TIGERweb
  // REST service (tigerweb.geo.census.gov, "BAS 2026" vintage — Roy caught
  // this, checking it directly after the first, static-only attempt landed
  // at only 81.1%) is current enough that MOST districts already carry
  // their real "Regional School Unit NN" name there — just not ALL of them:
  // Census's own data is a genuine mix, some districts still sit under
  // their legacy "School Administrative District NN" name even in the
  // current vintage (confirmed directly: RSU 06/57/11/17/40/etc. are
  // "School Administrative District" in TIGERweb today, not "Regional
  // School Unit", while RSU 01/02/04/05/09/etc. HAVE converted). Since
  // there's no way to know which naming a given district currently uses
  // from the raw row alone, the preprocess returns BOTH candidates (plus
  // the explicit "/MSAD NN" alias when the raw name has one — 9 of 48
  // checked compound names have an RSU number that genuinely differs from
  // its own MSAD alias, e.g. "RSU 79/MSAD 01", so that alias is always
  // tried ahead of a same-number guess) and `buildDistrictMapper` tries
  // each in turn. Boundary file rebuilt from the live service's layers 0-2
  // (Unified/Secondary/Elementary), not the static bulk download. Result:
  // 99.2% of the real population matches — the only real gap is "Education
  // in Unorganized Terr" (87 students, 0.8%), a genuine non-geographic
  // category (homeschoolers in Maine's unorganized territories, no local
  // school unit to attach to), same "floor not ceiling" shape as Georgia's
  // non-matching independent districts. Previously list-only ("structurally
  // blocked" — see decisions.md 2026-10-06); Roy questioned that framing
  // 2026-10-07, re-investigated, fixed with the static source (81.1%), then
  // fixed properly with the live source after Roy flagged he wasn't
  // satisfied with 81.1% and pointed at TIGERweb directly.
  ME: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("me"),
    // "Education in Unorganized Terr[itory]" is real (students across
    // Maine's vast state-administered unorganized territories, which have no
    // town government at all) but structurally has no single polygon to map
    // to — the known, already-documented Unorganized-Territory granularity
    // gap from the 2026-10-07 map investigation, not a naming puzzle.
    // "NULL" is a literal placeholder value in the raw sheet, not a place —
    // real for exactly one row (2023, 5 students), worth a tiny flag to JHU,
    // but not something to guess a name for.
    excludeNames: new Set(["Education in Unorganized Terr", "NULL"]),
    _preprocess: (raw) => {
      // Mount Desert is Maine's one same-key collision (same shape as TN/NH's
      // — two real entities, "Mount Desert" the town unit and "Mount Desert
      // Community School District" the consolidated one, both reduce to
      // "mount desert" once stopwords strip "community"/"school"/"district").
      if (raw === "Mount Desert Public Schools") return "Mount Desert";
      if (raw === "Mt Desert CSD") return "Mount Desert Community School District";
      const msad = /msad\s*0*(\d+)/i.exec(raw);
      const rsu = /^rsu\s*0*(\d+)/i.exec(raw);
      const num = msad ? msad[1] : rsu ? rsu[1] : null;
      if (num == null) return raw;
      const n2 = num.padStart(2, "0");
      return [raw, `Regional School Unit ${n2}`, `School Administrative District ${n2}`];
    },
  }, // 99.4%
};
for (const [code, cfg] of Object.entries(MAP_MATCHED)) {
  if (cfg.mapName) continue;
  cfg.mapName = cfg.geoPath.includes("-counties.json")
    ? buildCountyMapper(cfg.geoPath, code)
    : buildDistrictMapper(cfg.geoPath, {
        allowPrefix: cfg._allowPrefix,
        preprocess: cfg._preprocess,
      });
}

// States with clean, simple rows (one row per unit per year, numeric totals)
// but no boundary file yet — rendered as a real ranked list, no map, same
// pattern as Hawaii's hand-entered card. `nameField` is whichever raw column
// actually holds that state's reporting unit (checked directly per state —
// see decisions.md).
export const LIST_ONLY = {
  // Hawaii's "districts" are HIDOE "complex areas" (an internal
  // administrative division, not a real federal/TIGER boundary — confirmed
  // the real Census source has exactly ONE feature for Hawaii, the whole
  // state as a single legal district), so list-only is permanent here, not
  // a placeholder. Real complex-area rows + age/gender demographics only
  // exist 2019–2022; other years in the workbook are a bare state total
  // with no breakdown at all. Pinned to 2022 (richest, last such year) for
  // the default view/demographics — same shape as New Mexico's pinnedYear.
  // "Charter" is a real raw row (real students) but not a geographic
  // complex area — excluded from the region list, same as the original
  // hand-entered card did, so it doesn't look like one of the 7 real areas.
  HI: {
    nameField: "district ",
    geoUnit: "district",
    pinnedYear: 2022,
    excludeNames: new Set(["Charter"]),
  },
};

// Grade demographics, shared across every state. Sums whatever grade columns
// are actually numeric, buckets into Elementary/Middle/High when the fine
// columns exist, else falls back to a state's own coarse buckets (Montana
// only has grade1_8/grade9_12) — never invents a split the data doesn't
// support. Null if there's nothing usable.
function extractGradeDemographics(rows) {
  const sum = (field) => {
    const vals = rows.map((r) => r[field]).filter((v) => typeof v === "number");
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };
  const fine = {
    "Elementary (K–5)": ["grade_k", "grade_1", "grade_2", "grade_3", "grade_4", "grade_5"],
    "Middle (6–8)": ["grade_6", "grade_7", "grade_8"],
    "High (9–12)": ["grade_9", "grade_10", "grade11", "grade_12"],
  };
  const fineBuckets = Object.entries(fine)
    .map(([label, fields]) => {
      const parts = fields.map(sum).filter((v) => v != null);
      return parts.length ? { label, total: parts.reduce((a, b) => a + b, 0) } : null;
    })
    .filter(Boolean);
  if (fineBuckets.length >= 2) return toPct(fineBuckets);

  const coarse = { "Grades 1–8": "grade1_8", "Grades 9–12": "grade9_12" };
  const coarseBuckets = Object.entries(coarse)
    .map(([label, field]) => {
      const total = sum(field);
      return total != null ? { label, total } : null;
    })
    .filter(Boolean);
  return coarseBuckets.length >= 2 ? toPct(coarseBuckets) : null;
}

// Generic race/gender extractors — same column names everywhere in the
// workbook, so no per-state logic needed beyond "which ones are populated."
function extractColumnDemographics(rows, fieldsToLabels) {
  const buckets = Object.entries(fieldsToLabels)
    .map(([field, label]) => {
      const vals = rows.map((r) => r[field]).filter((v) => typeof v === "number");
      return vals.length ? { label, total: vals.reduce((a, b) => a + b, 0) } : null;
    })
    .filter(Boolean);
  return buckets.length >= 2 ? toPct(buckets) : null;
}

function toPct(buckets) {
  const sum = buckets.reduce((a, b) => a + b.total, 0);
  if (!sum) return null;
  return buckets
    .map((b) => ({ label: b.label, pct: Math.round((b.total / sum) * 100) }))
    .filter((b) => b.pct > 0);
}

function extractDemographics(latestYearRows) {
  const demographics = {};
  const grade = extractGradeDemographics(latestYearRows);
  if (grade) demographics.grade = grade;
  const gender = extractColumnDemographics(latestYearRows, {
    gender_sex_male: "Male",
    gender_sex_female: "Female",
    gender_sex_other: "Other / not specified",
  });
  if (gender) demographics.gender = gender;
  const race = extractColumnDemographics(latestYearRows, {
    race_white: "White",
    race_black: "Black",
    race_asian: "Asian",
    race_nativeamerican: "Native American",
    race_nativehawaiian: "Native Hawaiian",
    race_multi: "Multiracial",
    race_other: "Other / not specified",
  });
  if (race) demographics.race = race;
  return demographics;
}

// Every column that can hold a reporting unit's place name, across all 27
// states — a row is the state's own designated grand-total for its year if
// EVERY one of these is blank, or holds an explicit rollup sentinel (Georgia
// has no state-level row of its own, but other states do: a Montana/North
// Carolina/Tennessee row with every geography column blank; a Minnesota row
// tagged lcounty="All"/district="Total"). See isGrandTotalRow below.
const GEO_COLUMNS = ["sau_name", "lea", "lcounty", "district ", "town ", "lcity"];
// "state"/"state total" added 2026-10-12 — Massachusetts's rollup row uses
// these, which weren't recognized, so isGrandTotalRow missed it and the
// fallback sum-path double-counted every MA year except the latest (no
// grand-total-row-preference kicked in, so the real per-town sum AND this
// row's own identical total both got added). Confirmed before fixing: this
// row's own value exactly equals the sum of that year's real town rows,
// every year 2010-2023 — same bug shape as the Montana double-count already
// fixed, just a sentinel word this set didn't have yet.
const TOTAL_SENTINELS = new Set([
  "all",
  "total",
  "totals",
  "statewide",
  "grand total",
  "state",
  "state total",
]);

export function isGrandTotalRow(row) {
  return GEO_COLUMNS.every((col) => {
    const v = (row[col] ?? "").toString().trim();
    return v === "" || TOTAL_SENTINELS.has(v.toLowerCase());
  });
}

// Maine is the one state (confirmed via a full state-by-state audit,
// 2026-10-05) that reports TWO disagreeing whole-state totals every year
// back to 2019, not a simple duplicate — one series always carries a full
// age breakdown, the other never does, and they can disagree by a lot (68%
// apart in 2019). Flagged back to JHU to find out which is authoritative —
// Roy's working theory meanwhile is that the age-profiled series likely
// excludes areas that don't report by age (i.e. undercounts), so prefer
// whichever grand-total candidate has NO age breakdown until that's
// resolved. See decisions.md, 2026-10-05.
function hasAgeBreakdown(row) {
  return Object.keys(row).some((k) => k.startsWith("age") && typeof row[k] === "number");
}

// Any grade/gender/race column extractDemographics below would actually use.
function hasAnyDemographics(row) {
  return Object.keys(row).some(
    (k) => /^(grade|gender_sex|race)/.test(k) && typeof row[k] === "number",
  );
}

// Raw count cells aren't all real numbers (checked directly against the
// 2026-10-02 workbook, ~78k rows): most non-numeric values are either a real
// number typed as text (1,194 cells, e.g. "12") or an explicit non-response
// ("Did Not Report", "NA", a bare "-" — 124 cells, no usable info at all) —
// but 1,863 cells use a real suppression convention (small-cell masking) and
// still carry genuine information: "<10", "*", "masked". Both the numeric-
// string case and the suppression case were previously indistinguishable
// from a blank cell (typeof check failed, row silently dropped, same as
// never having reported) — the former silently lost real counts, the latter
// lost real-but-masked ones. Returns null for anything with no usable value.
const SUPPRESSION_CODES = new Set(["<10", "*", "masked"]);

// TN-only: "CS" means "complementary suppression" (confirmed by Genny,
// 2026-10-27 — see decisions.md) — same "real row, no usable count" shape as
// the suppression codes above, but shown as "–" rather than verbatim: unlike
// "<10", "CS" reads as a confusing undefined code to a site visitor, and
// Genny agreed "–" is clearer. Confirmed nowhere else in the 27-state
// workbook, so safe to normalize here rather than scoping it to TN's config.
const CS_DISPLAY = "–";

function parseCount(raw) {
  if (typeof raw === "number") return { value: raw, code: null };
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber)) return { value: asNumber, code: null };
  const lower = trimmed.toLowerCase();
  if (lower === "cs") return { value: null, code: CS_DISPLAY };
  if (SUPPRESSION_CODES.has(lower)) return { value: null, code: trimmed };
  return null; // "Did Not Report", "NA", "-", or anything unrecognized
}

// One state's rows -> { year, total, reporting, regions, demographics }.
// Map mode (`validNames` set) only counts a row toward `regions` if its
// normalized name matches the geometry; list mode (`validNames` null) takes
// every named row as its own region.
//
// `regions` only includes names reporting in the LATEST year, not every name
// that ever showed up since 1984 — unit names churn too much over decades
// (consolidations, renames, early-year spelling) to union the whole history
// without padding the table with dead entries. Each current region still
// carries its real multi-year `values` wherever history exists.
export function shapeState({
  rows,
  nameField,
  mapName,
  validNames,
  pinnedYear,
  countField = "total_enrollment_ count",
  excludeNames,
  excludeYears,
}) {
  const rowsByYear = new Map(); // every dated row, keyed by raw sy_fall — also feeds demographics below
  for (const row of rows) {
    const year = row.sy_fall;
    if (year == null) continue;
    (rowsByYear.get(year) ?? rowsByYear.set(year, []).get(year)).push(row);
  }

  // The real headline total, per year. Several states' sheets turned out to
  // report the SAME students more than once per year — a dedicated rollup
  // row that already IS the whole-state total (see isGrandTotalRow), or two
  // full parallel geography tiers for the same population (Arkansas reports
  // every homeschooler once by county AND once by district, no rollup row at
  // all). Blindly summing every row double-counted both cases (caught via a
  // full state-by-state audit, 2026-10-05 — Montana showed 19,576 against a
  // real total of 9,788). Fix: prefer a state/year's own rollup row when one
  // exists; otherwise sum only the rows reported at THIS state's configured
  // nameField tier, ignoring any row named only in some OTHER geography
  // column (a different, redundant tier reporting the same population).
  const yearTotals = new Map();
  for (const [year, yearRows] of rowsByYear) {
    const grandTotalCandidates = yearRows.filter(
      (r) => isGrandTotalRow(r) && parseCount(r[countField])?.value != null,
    );
    const grandTotalRow =
      grandTotalCandidates.find((r) => !hasAgeBreakdown(r)) ?? grandTotalCandidates[0];
    if (grandTotalRow) {
      yearTotals.set(year, parseCount(grandTotalRow[countField]).value);
      continue;
    }
    let sum = 0;
    for (const r of yearRows) {
      const raw = r[nameField];
      const parsed = parseCount(r[countField]);
      // A suppressed cell (parsed.value == null) can't contribute a real
      // number to the sum — same "floor, not ceiling" treatment already
      // accepted elsewhere (Georgia's unmatched districts, Hawaii's Charter
      // exclusion) rather than guessing at what it masks.
      if (raw && raw.trim() && parsed?.value != null) sum += parsed.value;
    }
    yearTotals.set(year, sum);
  }

  // Unique matched NAMES per year, not raw matched ROWS — a county can have
  // several raw rows (e.g. several districts inside it), and counting rows
  // instead of names inflated the UI's "N of M counties reporting" past M
  // (caught live: Minnesota showed "322 of 87 counties reporting"). A
  // suppressed cell (e.g. "<10") still counts as that name REPORTING — JHU
  // gave a real, if masked, answer — same as a plain number; only a blank
  // cell or an explicit non-response ("Did Not Report", "NA", "-") doesn't.
  const matchedNamesByYear = new Map();
  const normalized = []; // { year, name, value, code } for every matched row

  for (const row of rows) {
    const year = row.sy_fall;
    if (year == null) continue;
    // A year whose nameField column is KNOWN to hold the wrong thing (e.g.
    // PA's 2024-25, where `lcounty`/`district ` swap meaning — see PA's
    // config below) can't contribute real regions: skip the match entirely
    // rather than let it run and silently attribute each raw value to
    // whichever real place coincidentally shares that name. The state's
    // real headline total for that year is unaffected (yearTotals above
    // doesn't depend on a real match, just a non-blank cell) — only that
    // year's region breakdown goes missing, same as any other real gap.
    if (excludeYears?.has(year)) continue;

    const parsed = parseCount(row[countField]);
    if (!parsed) continue;

    const raw = row[nameField];
    if (!raw || !raw.trim()) continue;
    if (excludeNames?.has(raw.trim())) continue; // real students, but not a geographic region
    const name = mapName ? mapName(raw.trim()) : raw.trim();
    if (validNames && !validNames.has(name)) continue;

    (matchedNamesByYear.get(year) ?? matchedNamesByYear.set(year, new Set()).get(year)).add(name);
    normalized.push({ year, name, value: parsed.value, code: parsed.code });
  }

  // Normally the most recent year. `pinnedYear` overrides this for a state
  // whose richest year isn't its latest — same call already made for Hawaii
  // in stateExplorerMockData.js (2022-23, its last year with a real area
  // breakdown): pin the WHOLE card to that year rather than mixing a newer
  // total with an older region/demographic breakdown.
  const latestYear = pinnedYear ?? Math.max(...yearTotals.keys());
  const latestLabel = yearLabel(latestYear);

  // Union of every year's matched names, not just latestYear's. Used to be
  // `normalized.filter((r) => r.year === latestYear)` — any real district
  // whose only gap happened to fall in that one anchor year vanished from
  // the table entirely, not even as a dash. Found via New Mexico's Wagon
  // Mound (first real row 2021, invisible because NM's anchor year was
  // pinned to 2020) but turned out to affect every MAP_MATCHED state, not
  // just NM — Maine alone recovered 11 real small-town/plantation districts
  // with a one-year gap in whatever year was previously the anchor. Doesn't
  // reintroduce decades-dead/consolidated entries: `validNames` (the
  // CURRENT real boundary file) already gates every row before it reaches
  // `normalized` above, so a name has to match a currently-real TIGER place
  // in at least one year to get in here at all. See decisions.md, 2026-10-12.
  const currentRoster = new Set(normalized.map((r) => r.name));

  // SUM, not overwrite: several states (Washington confirmed; likely others
  // using county as the display unit) have MULTIPLE raw rows per name per
  // year — e.g. several districts inside one county — because nameField is
  // coarser than the raw row. An overwrite here silently kept only the last
  // district's count per county instead of the county's real total (caught
  // live: Washington's county sum was ~3.3k against a real 31.7k total).
  // Harmless no-op for states where each name truly is one row per year.
  const regionsByName = new Map(); // current-roster name -> { values, codes }
  const entryFor = (name) =>
    regionsByName.get(name) ?? regionsByName.set(name, { values: {}, codes: {} }).get(name);

  // Pass 1: real numbers only, summed. Done as its own pass (not merged with
  // pass 2 below) so a real number always wins regardless of row order —
  // otherwise a code recorded before a same-name/year real row arrived would
  // wrongly survive.
  for (const { year, name, value } of normalized) {
    if (!currentRoster.has(name) || value == null) continue;
    const label = yearLabel(year);
    const entry = entryFor(name);
    entry.values[label] = (entry.values[label] ?? 0) + value;
  }
  // Pass 2: suppression codes, only where no real number already covers that
  // name/year. Rare case of two differing codes for the same coarser name
  // (e.g. a county summed from several suppressed district rows) keeps
  // whichever was seen first — there's no way to combine "<10" with "*".
  for (const { year, name, code } of normalized) {
    if (!currentRoster.has(name) || code == null) continue;
    const label = yearLabel(year);
    const entry = entryFor(name);
    if (entry.values[label] == null && entry.codes[label] == null) entry.codes[label] = code;
  }

  const regions = [...regionsByName.entries()]
    .map(([name, { values, codes }]) => ({ name, values, codes }))
    .sort((a, b) => (b.values[latestLabel] ?? 0) - (a.values[latestLabel] ?? 0));

  // Demographics prefer the state's own blank-geography ("statewide") rows
  // when any of them carry real grade/gender/race data — a single
  // authoritative measurement, not a geographic breakdown — falling back to
  // summing the named sub-region rows only when no statewide row has it.
  // NEVER both: confirmed (2026-10-07) that Hawaii's statewide row and its 7
  // complex-area + Charter rows independently carry the SAME overlapping
  // gender data (the complex areas are a subset of the same population the
  // statewide row already counts), so summing both silently doubled every
  // demographic value — invisible in the shipped percentages only because
  // the two sources happened to share almost the same ratio. Checked every
  // other state already showing demographics (AR/MT/NC/SC/SD/NH/NM/WI)
  // before shipping this: none of them has both a statewide row AND named
  // rows independently carrying the same columns, so this produces
  // byte-identical output for all of them — only Hawaii's underlying sums
  // change (the displayed percentages don't, since they were already
  // coincidentally right). See decisions.md, 2026-10-07.
  //
  // Computed per year (2026-10-08), not just latestYear — same row-selection
  // rule applied independently to every year in rowsByYear, so the panel can
  // show whichever year the selector is actually on instead of freezing to
  // the default/pinned year. A year with no demographic columns at all
  // anywhere in its rows (extractDemographics returns {}) is simply absent
  // from demographicsByYear — the frontend falls back/grays out for those.
  const demographicsByYear = {};
  for (const [year, yearRowsForYear] of rowsByYear) {
    const statewideDemoRows = yearRowsForYear.filter(
      (r) => isGrandTotalRow(r) && hasAnyDemographics(r),
    );
    const demoRowsForYear = statewideDemoRows.length
      ? statewideDemoRows
      : yearRowsForYear.filter((r) => !isGrandTotalRow(r));
    const demo = extractDemographics(demoRowsForYear);
    if (Object.keys(demo).length) demographicsByYear[yearLabel(year)] = demo;
  }

  // Per year, not just latestYear, so the UI's "N of M reporting" line can
  // track the year selector instead of staying frozen at whichever count
  // applied when the snapshot was built.
  const reportingCountByYear = Object.fromEntries(
    [...matchedNamesByYear.entries()].map(([year, names]) => [yearLabel(year), names.size]),
  );

  // Per year, not just latestYear — lets the region-sum audit check every
  // year's regionSum against its own true total instead of only the
  // default/latest one. That single-year blind spot is exactly what let
  // both the PA column-swap and the 2026-10-12 region-roster bug stay
  // invisible as long as they did. See decisions.md, 2026-10-12.
  const totalsByYear = Object.fromEntries(
    [...yearTotals.entries()].map(([year, total]) => [yearLabel(year), total]),
  );

  return {
    year: latestLabel,
    total: yearTotals.get(latestYear),
    totalsByYear,
    reportingCountByYear,
    regions,
    demographicsByYear,
    // Default/latest-year view — kept so anything not yet reading
    // demographicsByYear (or a hand-entered state with no per-year data)
    // still gets a sensible single breakdown.
    demographics: demographicsByYear[latestLabel] ?? {},
  };
}

function buildMapMatched(rows, code, cfg) {
  const validNames = geoNames(cfg.geoPath);
  const shaped = shapeState({
    rows: rows.filter((r) => r.lstate === code),
    nameField: cfg.nameField,
    mapName: cfg.mapName,
    validNames,
    pinnedYear: cfg.pinnedYear,
    countField: cfg.countField,
    excludeYears: cfg.excludeYears,
  });
  const reportingByYear = Object.fromEntries(
    Object.entries(shaped.reportingCountByYear).map(([yr, n]) => [yr, `${n} of ${validNames.size}`]),
  );
  return {
    ...shaped,
    name: NAME_BY_POSTAL[code],
    geoUnit: cfg.geoUnit,
    geoLabel: plural(cfg.geoUnit),
    hasRealGeo: true,
    reportingByYear,
    reporting: reportingByYear[shaped.year],
  };
}

function buildListOnly(rows, code, cfg) {
  const shaped = shapeState({
    rows: rows.filter((r) => r.lstate === code),
    nameField: cfg.nameField,
    mapName: null,
    validNames: null,
    pinnedYear: cfg.pinnedYear,
    countField: cfg.countField,
    excludeNames: cfg.excludeNames,
  });
  // No real boundary file, so no fixed "of N" denominator — just the count.
  const reportingByYear = Object.fromEntries(
    Object.entries(shaped.reportingCountByYear).map(([yr, n]) => [yr, String(n)]),
  );
  return {
    ...shaped,
    name: NAME_BY_POSTAL[code],
    geoUnit: cfg.geoUnit,
    geoLabel: plural(cfg.geoUnit),
    hasRealGeo: false,
    reportingByYear,
    reporting: reportingByYear[shaped.year],
  };
}

// Reads the workbook's long-format "raw data" tab (row 0 is a banner, row 1
// is the real header) from raw bytes — shared by the local manual-file CLI
// below and fetch-state-explorer-snapshot.mjs's live Drive pull, so both read
// the exact same way.
export function readRawRows(buf) {
  const wb = XLSX.read(buf, { type: "buffer" });
  return XLSX.utils.sheet_to_json(wb.Sheets["raw data"], {
    defval: null,
    range: 1,
  });
}

// Builds every MAP_MATCHED/LIST_ONLY state's entry from already-read raw
// rows, with the shape guard against a truncated/malformed source. Shared by
// the local manual-file CLI below and the live Drive-fetch script, so a
// source swap can't drift the two build paths apart.
export function buildStates(rows) {
  const states = {};
  for (const [code, cfg] of Object.entries(MAP_MATCHED)) {
    states[code] = buildMapMatched(rows, code, cfg);
  }
  for (const [code, cfg] of Object.entries(LIST_ONLY)) {
    states[code] = buildListOnly(rows, code, cfg);
  }

  // Shape guard: refuse to write a snapshot visibly smaller than the known-
  // good hand-entered baseline for the two states we've validated before
  // (156/69 matched regions) — catches a bad re-run against a truncated or
  // malformed source file rather than silently shrinking the live app's
  // data. The newly-added list-only states have no prior baseline to check
  // against, so they're sanity-checked generically instead (must have found
  // at least one region).
  if (states.GA.regions.length < 150 || states.LA.regions.length < 60) {
    throw new Error(
      `state-explorer snapshot: GA ${states.GA.regions.length} / LA ${states.LA.regions.length} ` +
        `matched regions, below the expected floor — refusing to write`,
    );
  }
  for (const [code, state] of Object.entries(states)) {
    if (state.regions.length === 0) {
      throw new Error(`state-explorer snapshot: ${code} has zero regions — refusing to write`);
    }
  }

  // reportingCountByYear was only needed to build reportingByYear above.
  for (const state of Object.values(states)) delete state.reportingCountByYear;

  return states;
}

function main() {
  const rows = readRawRows(readFileSync(SOURCE_PATH));
  const states = buildStates(rows);

  writeSnapshot(OUT_PATH, { source: SOURCE_PATH, states });

  console.log(`wrote ${OUT_PATH}`);
  for (const [code, state] of Object.entries(states)) {
    const demoKeys = Object.keys(state.demographics).join(",") || "none";
    console.log(
      `${code}: ${state.regions.length} regions, through ${state.year}, ` +
        `total ${state.total}, demographics: ${demoKeys}`,
    );
  }
}

// Guarded so other scripts (e.g. audit-state-explorer-totals.mjs) can import
// this module's exports for reuse without triggering a full rebuild.
if (import.meta.url === `file://${process.argv[1]}`) main();
