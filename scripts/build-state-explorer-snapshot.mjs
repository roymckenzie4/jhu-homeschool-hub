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
const SOURCE_PATH = resolve(
  HERE,
  "../../notes/2026-10-02-combined-state-data-from-jhu-expanded.xlsx",
);
const OUT_PATH = resolve(HERE, "../src/data/state-explorer-snapshot.json");
const GEO_DIR = resolve(HERE, "../public/state-explorer-geo");
const GA_GEO_PATH = resolve(GEO_DIR, "ga-counties.json");
const LA_GEO_PATH = resolve(GEO_DIR, "la-districts.json");

const NAME_BY_POSTAL = Object.fromEntries(STATES.map((s) => [s.postal, s.name]));

// School-year label matching the rest of the app's convention (e.g. 2024 ->
// "2024–25") so merged regions key identically to the hand-entered years
// already in stateExplorerMockData.js.
function yearLabel(fallYear) {
  return `${fallYear}–${String(fallYear + 1).slice(-2)}`;
}

function plural(unit) {
  return unit === "county" ? "counties" : `${unit}s`;
}

// us-atlas/TIGER geometry names, read straight out of the committed topojson
// rather than hardcoded, so this stays correct if the geo files ever change.
function geoNames(path) {
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

// States with a real published boundary file + a name-normalization function
// to join the workbook's raw unit names to that geometry.
const MAP_MATCHED = {
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
};
for (const [code, cfg] of Object.entries(MAP_MATCHED)) {
  if (!cfg.mapName) cfg.mapName = buildCountyMapper(cfg.geoPath, code);
}

// States with clean, simple rows (one row per unit per year, numeric totals)
// but no boundary file yet — rendered as a real ranked list, no map, same
// pattern as Hawaii's hand-entered card. `nameField` is whichever raw column
// actually holds that state's reporting unit (checked directly per state —
// see decisions.md).
const LIST_ONLY = {
  SC: { nameField: "district ", geoUnit: "district" },
  SD: { nameField: "district ", geoUnit: "district" },
  NC: { nameField: "district ", geoUnit: "district" },
  NY: { nameField: "district ", geoUnit: "district" },
  // PA's raw "lcounty" column is ~500 distinct values — real Pennsylvania has
  // 67 counties but ~500 school districts, so despite the column name this
  // is clearly district-level granularity; labeled accordingly.
  PA: { nameField: "lcounty", geoUnit: "district" },
  TN: { nameField: "district ", geoUnit: "district" },
  ME: { nameField: "district ", geoUnit: "district" },
  CO: { nameField: "district ", geoUnit: "district" },
  WY: { nameField: "district ", geoUnit: "district" },
  RI: { nameField: "district ", geoUnit: "district" },
  MA: { nameField: "town ", geoUnit: "town" },
  NH: { nameField: "district ", geoUnit: "district" },
  // Both were in the original drop; first pass had the wrong column (their
  // real per-district rows use "district ", not "lcounty") so every row
  // failed to match a name and both zero-regioned out.
  // NM's 2020 rows carry the richest statewide demographics in the whole
  // workbook (full K-12 grade, 3-way gender, 7-way race — checked against
  // its own total, all three sum close to it) but its real district rows
  // stop reporting demographics after that year, same situation as Hawaii's
  // hand-entered card — pin the whole card to 2020 rather than show a newer,
  // demographic-less total next to an older breakdown.
  NM: { nameField: "district ", geoUnit: "district", pinnedYear: 2020 },
  WI: { nameField: "district ", geoUnit: "district" },
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
function shapeState({ rows, nameField, mapName, validNames, pinnedYear }) {
  const yearTotals = new Map(); // ALL rows, matched or not — the real headline total
  const matchedCountByYear = new Map();
  const rowsByYear = new Map(); // for demographics, keyed by raw sy_fall
  const normalized = []; // { year, name, total } for every matched row

  for (const row of rows) {
    const year = row.sy_fall;
    if (year == null) continue;
    // Demographics can live on a row with no total of its own (New Mexico
    // tags a demographic category's full breakdown onto a row with its name
    // field set to the category's label instead of a place, total blank) —
    // record every dated row for demographics before the total check below
    // skips it for the total/regions purposes.
    (rowsByYear.get(year) ?? rowsByYear.set(year, []).get(year)).push(row);

    const total = row["total_enrollment_ count"];
    if (typeof total !== "number") continue;
    yearTotals.set(year, (yearTotals.get(year) ?? 0) + total);

    const raw = row[nameField];
    if (!raw || !raw.trim()) continue;
    const name = mapName ? mapName(raw.trim()) : raw.trim();
    if (validNames && !validNames.has(name)) continue;

    matchedCountByYear.set(year, (matchedCountByYear.get(year) ?? 0) + 1);
    normalized.push({ year, name, total });
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
  const regionsByName = new Map(); // current-roster name -> { year-label -> total }
  for (const { year, name, total } of normalized) {
    if (!currentRoster.has(name)) continue;
    if (!regionsByName.has(name)) regionsByName.set(name, {});
    const byYear = regionsByName.get(name);
    byYear[yearLabel(year)] = (byYear[yearLabel(year)] ?? 0) + total;
  }

  const regions = [...regionsByName.entries()]
    .map(([name, values]) => ({ name, values }))
    .sort((a, b) => (b.values[latestLabel] ?? 0) - (a.values[latestLabel] ?? 0));

  return {
    year: latestLabel,
    total: yearTotals.get(latestYear),
    reportingCount: matchedCountByYear.get(latestYear),
    regions,
    demographics: extractDemographics(rowsByYear.get(latestYear) ?? []),
  };
}

function buildMapMatched(rows, code, cfg) {
  const validNames = geoNames(cfg.geoPath);
  const shaped = shapeState({
    rows: rows.filter((r) => r.lstate === code),
    nameField: cfg.nameField,
    mapName: cfg.mapName,
    validNames,
  });
  return {
    ...shaped,
    name: NAME_BY_POSTAL[code],
    geoUnit: cfg.geoUnit,
    geoLabel: plural(cfg.geoUnit),
    hasRealGeo: true,
    reporting: `${shaped.reportingCount} of ${validNames.size}`,
  };
}

function buildListOnly(rows, code, cfg) {
  const shaped = shapeState({
    rows: rows.filter((r) => r.lstate === code),
    nameField: cfg.nameField,
    mapName: null,
    validNames: null,
    pinnedYear: cfg.pinnedYear,
  });
  return {
    ...shaped,
    name: NAME_BY_POSTAL[code],
    geoUnit: cfg.geoUnit,
    geoLabel: plural(cfg.geoUnit),
    hasRealGeo: false,
    reporting: String(shaped.reportingCount),
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

  // reportingCount was only needed to build `reporting` above.
  for (const state of Object.values(states)) delete state.reportingCount;

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

main();
