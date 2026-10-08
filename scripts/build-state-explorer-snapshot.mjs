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
  "../../notes/2026-10-02-combined-state-data-from-jhu-expanded.xlsx",
);
const OUT_PATH = resolve(HERE, "../src/data/state-explorer-snapshot.json");
const GEO_DIR = resolve(HERE, "../public/state-explorer-geo");
const GA_GEO_PATH = resolve(GEO_DIR, "ga-counties.json");
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

// Georgia: raw district names are "X County" (plus some independent/charter
// schools and "Optional (undisclosed)" that don't correspond to any county —
// excluded, same as the hand-entered data's "156 of 159" framing).
function mapGaName(raw) {
  return raw.replace(/\s+County$/, "").trim();
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
const NY_PREPROCESS = (raw) =>
  /^NEW YORK CITY GEOGRAPHIC DISTRICT/i.test(raw) ? "New York City Department Of Education" : raw;

// Nashville and Clarksville are consolidated city-county governments, so
// their real TIGER school-district names don't contain "Davidson"/
// "Montgomery" at all — not an abbreviation issue districtNormKey can
// generalize, just two real, different legal names worth hardcoding (same
// shape as Louisiana's special cases above). These two account for nearly
// all of TN's unmatched total.
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
  "Davidson Co.": "Metropolitan Nashville Public School District",
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
  GA: { nameField: "district ", geoUnit: "county", mapName: mapGaName, geoPath: GA_GEO_PATH },
  LA: { nameField: "district ", geoUnit: "district", mapName: mapLaName, geoPath: LA_GEO_PATH },
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
  // (2026-10-06).
  SC: { nameField: "district ", geoUnit: "district", geoPath: districtGeoPath("sc") }, // 91.7%
  SD: { nameField: "district ", geoUnit: "district", geoPath: districtGeoPath("sd") }, // 92.6%
  NY: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("ny"),
    _preprocess: NY_PREPROCESS,
  }, // 92.5% before the NYC collapse fix, see decisions.md (2026-10-06)
  // PA's raw "lcounty" column is ~500 distinct values — real Pennsylvania has
  // 67 counties but ~500 school districts, so despite the column name this
  // is clearly district-level granularity; labeled accordingly.
  PA: { nameField: "lcounty", geoUnit: "district", geoPath: districtGeoPath("pa") }, // 99.4%
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
  }, // 97.9% before the Nashville/Clarksville fix, see decisions.md (2026-10-06)
  CO: { nameField: "district ", geoUnit: "district", geoPath: districtGeoPath("co") }, // 86.0%
  WY: { nameField: "district ", geoUnit: "district", geoPath: districtGeoPath("wy") }, // 94.1%
  RI: { nameField: "district ", geoUnit: "district", geoPath: districtGeoPath("ri") }, // 100%
  MA: { nameField: "town ", geoUnit: "town", geoPath: districtGeoPath("ma", "towns") }, // 99.4%
  NH: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("nh"),
    _preprocess: (raw) => NH_SPECIAL_CASES[raw] ?? raw,
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
  }, // 95.5%
  // Wisconsin's raw column truncates to a fixed length (same issue Nebraska's
  // counties had) — the generic mapper's prefix-match fallback handles it.
  WI: {
    nameField: "district ",
    geoUnit: "district",
    geoPath: districtGeoPath("wi"),
    _allowPrefix: true,
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
const TOTAL_SENTINELS = new Set(["all", "total", "totals", "statewide", "grand total"]);

function isGrandTotalRow(row) {
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

function parseCount(raw) {
  if (typeof raw === "number") return { value: raw, code: null };
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber)) return { value: asNumber, code: null };
  if (SUPPRESSION_CODES.has(trimmed.toLowerCase())) return { value: null, code: trimmed };
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
  const currentRoster = new Set(
    normalized.filter((r) => r.year === latestYear).map((r) => r.name),
  );

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
  const yearRows = rowsByYear.get(latestYear) ?? [];
  const statewideDemoRows = yearRows.filter((r) => isGrandTotalRow(r) && hasAnyDemographics(r));
  const demoRows = statewideDemoRows.length
    ? statewideDemoRows
    : yearRows.filter((r) => !isGrandTotalRow(r));

  // Per year, not just latestYear, so the UI's "N of M reporting" line can
  // track the year selector instead of staying frozen at whichever count
  // applied when the snapshot was built.
  const reportingCountByYear = Object.fromEntries(
    [...matchedNamesByYear.entries()].map(([year, names]) => [yearLabel(year), names.size]),
  );

  return {
    year: latestLabel,
    total: yearTotals.get(latestYear),
    reportingCountByYear,
    regions,
    demographics: extractDemographics(demoRows),
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

function main() {
  const wb = XLSX.read(readFileSync(SOURCE_PATH), { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["raw data"], {
    defval: null,
    range: 1,
  });

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
