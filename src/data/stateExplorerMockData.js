/**
 * Data for the Phase 2 "State Explorer" concept tab.
 *
 * NOT a real loader — hand-entered from JHU's own draft collection template
 * (`combined-state-from-jhu.xlsx`, "raw data template" sheet), not wired to
 * any live snapshot or CSV. JHU's underlying data shape (wide vs. long) and
 * sub-state geography approach (county/district/town, standardized across
 * states or left per-state) are both still being decided as of Sept 2026;
 * this exists so the concept can be reviewed in the real app without
 * committing to either answer yet. Delete/replace wholesale once a real data
 * pipeline for this view exists.
 *
 * Every number below is REAL — pulled directly from JHU's draft template,
 * not invented — specifically so this holds up if Angela/Genny compare it
 * against what they actually submitted. Each state uses its own single most
 * complete recent school year (noted per state below); values are otherwise
 * copied as-is, not projected/estimated. State totals will NOT exactly match
 * the live Enrollment tab's numbers for the same state — that tab reads a
 * different, already-published source (the Homeschool Hub CSV/snapshot);
 * this tab reads JHU's separate internal draft template. Georgia happens to
 * agree exactly (89,510 both places); Delaware/Louisiana/Hawaii differ by a
 * few percent, expected given the different collection efforts — worth a
 * heads-up if asked, not a bug.
 *
 * The four states genuinely differ in what JHU's draft has for them (not a
 * designed "cover every combination" exercise — this is just what's real):
 * Hawaii has both a real sub-state breakdown (by HIDOE complex area) AND
 * demographics (gender), but only through school year 2022–23 — 2024/2025
 * have a state total but no complex-area breakdown that year, so Hawaii's
 * card uses 2022–23 throughout for internal consistency rather than mixing
 * years. Delaware has real demographics (grade + race) but NO sub-state
 * breakdown anywhere in the draft. Georgia and Louisiana have real sub-state
 * breakdowns but NO demographics anywhere in the draft, for any state, other
 * than Hawaii/Delaware — checked directly (grade/gender/race columns are
 * blank for every other one of JHU's 9 draft states).
 *
 * Each state also has a `context` block — sports/course/extracurricular
 * access + public funding, the remaining "access/funding info" JHU asked for
 * early on (see running-notes.md) but was never built anywhere, since the
 * standalone Policy view it was originally floated for never got built
 * either. Real values, hand-entered (not yet in a documented sheet column
 * the way the Legislation tab's 4 existing fields are — same "hand-entered
 * for now" caveat as everything else in this file). Only
 * Georgia's fields carry a real source `url`, to illustrate where a real
 * per-field link will go once this is a real loader (same pattern as the
 * Regulation heat map's per-cell source links) — the other three states'
 * fields are plain values for now.
 *
 * Each region carries `values`, a year -> count map, rather than a flat
 * `value` — even though every state here only has one year populated today.
 * Real per-county history exists in JHU's draft for most states and is a
 * near-term follow-up (county/district compare); shaping this as year-keyed
 * now means adding more years later is a data-only change, not a rework of
 * the map/table/comparison components that read through `valueForYear`.
 */

// Region value for a given year, or null if that region has no row for it
// (a future multi-year state may not report every county every year).
export function valueForYear(region, year) {
  return region.values[year] ?? null;
}

export const EXPLORER_STATES = {
  HI: {
    name: "Hawaii",
    total: 4901,
    // Most recent year with a real per-complex-area breakdown in the draft
    // (2024/2025 have a state total + demographics but no area breakdown
    // that year) — using 2022–23 throughout this card, not just for the
    // regions, so the headline number and the region list agree.
    year: "2022–23",
    // No map for Hawaii: its "districts" are HIDOE "complex areas," an
    // internal administrative division — checked, and the real federal
    // source (Census/NCES TIGER school-district boundaries) has exactly ONE
    // feature for Hawaii ("Hawaii Department of Education", the whole state
    // as a single legal district). Complex-area boundaries aren't published
    // federal geography, so there's no real shape to draw — the ranked list
    // below is real information on its own; a fabricated map would not be.
    geoUnit: "district",
    geoLabel: "districts",
    // All 7 of Hawaii's real geographic complex areas have a row this year
    // (a separate "Charter" row also exists in the draft but isn't a
    // geographic area, so it's excluded from this list — not a reporting gap).
    reporting: "7 of 7",
    regions: [
      { name: "Central", values: { "2022–23": 942 } },
      { name: "Leeward", values: { "2022–23": 723 } },
      { name: "Hawaii", values: { "2022–23": 667 } },
      { name: "Windward", values: { "2022–23": 397 } },
      { name: "Maui", values: { "2022–23": 389 } },
      { name: "Honolulu", values: { "2022–23": 284 } },
      { name: "Kauai", values: { "2022–23": 201 } },
    ],
    // Real gender split from the 2022–23 aggregate row (male 2,551 / female
    // 2,349 of 4,901 total) — no third "not specified" category exists in
    // JHU's draft for Hawaii, unlike an earlier illustrative pass here.
    demographics: {
      gender: [
        { label: "Male", pct: 52 },
        { label: "Female", pct: 48 },
      ],
    },
    // Access/funding context — from the Legislation sheet's remaining fields
    // (requested early on, never built into any view; see StateExplorerPanel
    // .jsx's StateContextList). No source link for Hawaii yet — only
    // Georgia's are wired in, to illustrate where a real per-field source
    // link will go once this is a real loader.
    context: {
      sportsAccess: { value: "No" },
      courseAccess: { value: "No" },
      extracurricularAccess: { value: "No" },
      publicFunding: { value: "No" },
    },
  },
  DE: {
    name: "Delaware",
    total: 3920,
    year: "2024–25",
    // No sub-state geography reported anywhere in JHU's draft for Delaware.
    geoUnit: null,
    geoLabel: null,
    reporting: null,
    regions: null,
    demographics: {
      // Real per-grade counts (K–12 + two "ungraded" codes) from the 2024–25
      // row, bucketed the same way as elsewhere in this file; percentages
      // are relative to the three shown buckets (K–12 sums to ~3,751 of the
      // 3,920 total — the remainder is the two ungraded codes, not shown).
      grade: [
        { label: "Elementary (K–5)", pct: 50 },
        { label: "Middle (6–8)", pct: 24 },
        { label: "High (9–12)", pct: 26 },
      ],
      // Real race counts from the same row (White 2,597 / Black 409 /
      // Multiracial 460 of 3,920 total); JHU's draft has no populated
      // "Asian" value for Delaware, unlike an earlier illustrative pass
      // here — the remainder (454, ~12%) folds into Other/not specified
      // rather than being invented.
      race: [
        { label: "White", pct: 66 },
        { label: "Black", pct: 10 },
        { label: "Multiracial", pct: 12 },
        { label: "Other / not specified", pct: 12 },
      ],
    },
    context: {
      sportsAccess: { value: "No" },
      courseAccess: { value: "No" },
      extracurricularAccess: { value: "No" },
      publicFunding: { value: "No" },
    },
  },
  GA: {
    name: "Georgia",
    total: 89510,
    year: "2024–25",
    // Real county boundaries (US Census/us-atlas), pruned to just Georgia —
    // see public/state-explorer-geo/ga-counties.json and
    // lib/geoProjection.js's buildStateProjection. JHU's real draft data
    // reports Georgia by DISTRICT, not county — district boundaries were
    // validated separately (Census/NCES TIGER, see ~/Active/work/jhu/sketches/
    // phase2-map-spike/) but not yet wired in per-state. County is shown here
    // as the fully-proven path.
    geoUnit: "county",
    geoLabel: "counties",
    // 156 of Georgia's 241 real reporting districts join directly to a
    // county name (bare name after stripping " County" — e.g. "Gwinnett
    // County" -> "Gwinnett"), covering $83,885 of the real $89,510 total.
    // The other 85 (independent city/charter/virtual districts like Atlanta
    // Public Schools, Marietta City, Georgia Cyber Academy — real $5,625
    // combined) don't correspond to a single county and aren't shown here,
    // consistent with the county-not-district caveat above — this list is a
    // real but partial view of the real total, same as the rest of the app's
    // "these counts are a floor" framing.
    reporting: "156 of 159",
    hasRealGeo: true,
    regions: [
      // ALL 156 real matched counties, not just the top ones — the map
      // colors whatever's in this list, so a partial list here would leave
      // the map looking sparse even though "156 of 159" is the real,
      // complete count. Names are bare (matching us-atlas's
      // `properties.name` exactly), from JHU's draft "X County" names with
      // " County" stripped.
      { name: "Gwinnett", values: { "2024–25": 5369 } },
      { name: "Cobb", values: { "2024–25": 4031 } },
      { name: "Cherokee", values: { "2024–25": 3570 } },
      { name: "Fulton", values: { "2024–25": 2973 } },
      { name: "DeKalb", values: { "2024–25": 2304 } },
      { name: "Paulding", values: { "2024–25": 2233 } },
      { name: "Forsyth", values: { "2024–25": 2190 } },
      { name: "Coweta", values: { "2024–25": 2161 } },
      { name: "Henry", values: { "2024–25": 2075 } },
      { name: "Columbia", values: { "2024–25": 2023 } },
      { name: "Houston", values: { "2024–25": 1615 } },
      { name: "Hall", values: { "2024–25": 1613 } },
      { name: "Richmond", values: { "2024–25": 1515 } },
      { name: "Carroll", values: { "2024–25": 1514 } },
      { name: "Fayette", values: { "2024–25": 1501 } },
      { name: "Walton", values: { "2024–25": 1488 } },
      { name: "Muscogee", values: { "2024–25": 1414 } },
      { name: "Bartow", values: { "2024–25": 1411 } },
      { name: "Newton", values: { "2024–25": 1280 } },
      { name: "Douglas", values: { "2024–25": 1264 } },
      { name: "Effingham", values: { "2024–25": 1147 } },
      { name: "Barrow", values: { "2024–25": 1129 } },
      { name: "Clayton", values: { "2024–25": 1112 } },
      { name: "Walker", values: { "2024–25": 1049 } },
      { name: "Jackson", values: { "2024–25": 1010 } },
      { name: "Floyd", values: { "2024–25": 940 } },
      { name: "Glynn", values: { "2024–25": 883 } },
      { name: "Bibb", values: { "2024–25": 854 } },
      { name: "Pickens", values: { "2024–25": 819 } },
      { name: "Catoosa", values: { "2024–25": 813 } },
      { name: "Lowndes", values: { "2024–25": 795 } },
      { name: "Camden", values: { "2024–25": 738 } },
      { name: "Rockdale", values: { "2024–25": 688 } },
      { name: "Bryan", values: { "2024–25": 682 } },
      { name: "Whitfield", values: { "2024–25": 658 } },
      { name: "Liberty", values: { "2024–25": 645 } },
      { name: "Bulloch", values: { "2024–25": 638 } },
      { name: "Clarke", values: { "2024–25": 638 } },
      { name: "Gordon", values: { "2024–25": 608 } },
      { name: "Harris", values: { "2024–25": 591 } },
      { name: "Habersham", values: { "2024–25": 588 } },
      { name: "Troup", values: { "2024–25": 559 } },
      { name: "Murray", values: { "2024–25": 553 } },
      { name: "Polk", values: { "2024–25": 549 } },
      { name: "Dawson", values: { "2024–25": 506 } },
      { name: "Franklin", values: { "2024–25": 499 } },
      { name: "Madison", values: { "2024–25": 492 } },
      { name: "Oconee", values: { "2024–25": 475 } },
      { name: "Stephens", values: { "2024–25": 473 } },
      { name: "Haralson", values: { "2024–25": 466 } },
      { name: "Gilmer", values: { "2024–25": 464 } },
      { name: "Lumpkin", values: { "2024–25": 457 } },
      { name: "Hart", values: { "2024–25": 453 } },
      { name: "Laurens", values: { "2024–25": 407 } },
      { name: "White", values: { "2024–25": 403 } },
      { name: "Union", values: { "2024–25": 398 } },
      { name: "Dougherty", values: { "2024–25": 389 } },
      { name: "Fannin", values: { "2024–25": 374 } },
      { name: "Colquitt", values: { "2024–25": 366 } },
      { name: "Monroe", values: { "2024–25": 362 } },
      { name: "Pike", values: { "2024–25": 359 } },
      { name: "Chattooga", values: { "2024–25": 357 } },
      { name: "Coffee", values: { "2024–25": 343 } },
      { name: "Tift", values: { "2024–25": 342 } },
      { name: "Meriwether", values: { "2024–25": 338 } },
      { name: "Ware", values: { "2024–25": 333 } },
      { name: "Dade", values: { "2024–25": 331 } },
      { name: "Banks", values: { "2024–25": 328 } },
      { name: "Long", values: { "2024–25": 318 } },
      { name: "Wayne", values: { "2024–25": 318 } },
      { name: "Jasper", values: { "2024–25": 307 } },
      { name: "Thomas", values: { "2024–25": 306 } },
      { name: "Lamar", values: { "2024–25": 304 } },
      { name: "Lee", values: { "2024–25": 298 } },
      { name: "McDuffie", values: { "2024–25": 289 } },
      { name: "Butts", values: { "2024–25": 287 } },
      { name: "Morgan", values: { "2024–25": 284 } },
      { name: "Pierce", values: { "2024–25": 283 } },
      { name: "Brantley", values: { "2024–25": 276 } },
      { name: "Peach", values: { "2024–25": 267 } },
      { name: "Burke", values: { "2024–25": 257 } },
      { name: "Elbert", values: { "2024–25": 256 } },
      { name: "Baldwin", values: { "2024–25": 254 } },
      { name: "Jones", values: { "2024–25": 233 } },
      { name: "Crawford", values: { "2024–25": 229 } },
      { name: "Toombs", values: { "2024–25": 229 } },
      { name: "Rabun", values: { "2024–25": 220 } },
      { name: "Oglethorpe", values: { "2024–25": 218 } },
      { name: "Grady", values: { "2024–25": 208 } },
      { name: "Emanuel", values: { "2024–25": 197 } },
      { name: "Tattnall", values: { "2024–25": 197 } },
      { name: "Decatur", values: { "2024–25": 192 } },
      { name: "Cook", values: { "2024–25": 170 } },
      { name: "Appling", values: { "2024–25": 164 } },
      { name: "Berrien", values: { "2024–25": 164 } },
      { name: "Putnam", values: { "2024–25": 161 } },
      { name: "Towns", values: { "2024–25": 155 } },
      { name: "Macon", values: { "2024–25": 151 } },
      { name: "Dodge", values: { "2024–25": 147 } },
      { name: "Brooks", values: { "2024–25": 141 } },
      { name: "Charlton", values: { "2024–25": 141 } },
      { name: "Heard", values: { "2024–25": 141 } },
      { name: "Worth", values: { "2024–25": 141 } },
      { name: "Screven", values: { "2024–25": 137 } },
      { name: "Crisp", values: { "2024–25": 134 } },
      { name: "Mitchell", values: { "2024–25": 134 } },
      { name: "Sumter", values: { "2024–25": 134 } },
      { name: "Ben Hill", values: { "2024–25": 131 } },
      { name: "Lanier", values: { "2024–25": 127 } },
      { name: "Wilkes", values: { "2024–25": 123 } },
      { name: "Bacon", values: { "2024–25": 120 } },
      { name: "Washington", values: { "2024–25": 120 } },
      { name: "Jefferson", values: { "2024–25": 115 } },
      { name: "Evans", values: { "2024–25": 112 } },
      { name: "Jeff Davis", values: { "2024–25": 110 } },
      { name: "Lincoln", values: { "2024–25": 106 } },
      { name: "Wilkinson", values: { "2024–25": 104 } },
      { name: "Telfair", values: { "2024–25": 101 } },
      { name: "Greene", values: { "2024–25": 98 } },
      { name: "Bleckley", values: { "2024–25": 96 } },
      { name: "Chattahoochee", values: { "2024–25": 96 } },
      { name: "Irwin", values: { "2024–25": 95 } },
      { name: "Johnson", values: { "2024–25": 94 } },
      { name: "McIntosh", values: { "2024–25": 93 } },
      { name: "Montgomery", values: { "2024–25": 93 } },
      { name: "Marion", values: { "2024–25": 89 } },
      { name: "Turner", values: { "2024–25": 89 } },
      { name: "Candler", values: { "2024–25": 82 } },
      { name: "Twiggs", values: { "2024–25": 82 } },
      { name: "Dooly", values: { "2024–25": 79 } },
      { name: "Pulaski", values: { "2024–25": 71 } },
      { name: "Taylor", values: { "2024–25": 71 } },
      { name: "Miller", values: { "2024–25": 69 } },
      { name: "Wilcox", values: { "2024–25": 67 } },
      { name: "Jenkins", values: { "2024–25": 66 } },
      { name: "Treutlen", values: { "2024–25": 64 } },
      { name: "Schley", values: { "2024–25": 63 } },
      { name: "Terrell", values: { "2024–25": 60 } },
      { name: "Hancock", values: { "2024–25": 59 } },
      { name: "Atkinson", values: { "2024–25": 56 } },
      { name: "Seminole", values: { "2024–25": 51 } },
      { name: "Talbot", values: { "2024–25": 51 } },
      { name: "Wheeler", values: { "2024–25": 50 } },
      { name: "Early", values: { "2024–25": 41 } },
      { name: "Taliaferro", values: { "2024–25": 41 } },
      { name: "Clinch", values: { "2024–25": 35 } },
      { name: "Stewart", values: { "2024–25": 34 } },
      { name: "Baker", values: { "2024–25": 32 } },
      { name: "Calhoun", values: { "2024–25": 28 } },
      { name: "Warren", values: { "2024–25": 28 } },
      { name: "Glascock", values: { "2024–25": 27 } },
      { name: "Echols", values: { "2024–25": 26 } },
      { name: "Randolph", values: { "2024–25": 25 } },
      { name: "Clay", values: { "2024–25": 13 } },
      { name: "Quitman", values: { "2024–25": 13 } },
      { name: "Webster", values: { "2024–25": 2 } },
    ],
    // No demographic breakdown anywhere in JHU's draft for Georgia.
    demographics: {},
    // Real source links — the only state with these wired in, to
    // illustrate the eventual per-field link pattern (same idea as the
    // Regulation heat map's per-cell source links) without building the
    // actual loader today. Sports/course/extracurricular access all cite the
    // same guidance doc (the Dexter Mosely Act governs all three); public
    // funding cites a separate program page.
    context: {
      sportsAccess: {
        value: "Maybe",
        url: "https://lor2.gadoe.org/gadoe/file/56c31133-0376-4498-88bd-c7a39072dfe6/1/Dexter%20Mosely%20Act%20-%20Guidance.pdf",
      },
      courseAccess: {
        value: "Maybe",
        url: "https://lor2.gadoe.org/gadoe/file/56c31133-0376-4498-88bd-c7a39072dfe6/1/Dexter%20Mosely%20Act%20-%20Guidance.pdf",
      },
      extracurricularAccess: {
        value: "Maybe",
        url: "https://lor2.gadoe.org/gadoe/file/56c31133-0376-4498-88bd-c7a39072dfe6/1/Dexter%20Mosely%20Act%20-%20Guidance.pdf",
      },
      publicFunding: {
        value: "Yes",
        url: "https://www.edchoice.org/school-choice/programs/georgia-promise-scholarship/",
      },
    },
  },
  LA: {
    name: "Louisiana",
    total: 17442,
    year: "2024–25",
    // Real SCHOOL DISTRICT boundaries (Census/NCES TIGER UNSD product,
    // current as of TIGER2024), converted with mapshaper — see
    // public/state-explorer-geo/la-districts.json. 69 real districts. Most
    // (64) are named/shaped like a parish, since each parish school board
    // runs one unified district co-terminous with the parish — but the
    // SOURCE is the school-district product, not a separate civil/parish
    // boundary file (that's TIGER's COUNTY product — what Georgia's map
    // above actually uses). The other 5 (Baker City, Bogalusa City, Central
    // Community, Monroe City, Zachary Community) are genuinely independent
    // districts carved out of a parish, not parishes themselves — a "Parish"
    // label would be flatly wrong for those. geoUnit is "district" (not
    // "parish") because that both matches what the data actually is AND
    // matches JHU's own categorization of Louisiana as a district-reporting
    // state (CO/GA/ME/LA/HI).
    geoUnit: "district",
    geoLabel: "districts",
    // Real: 69 of Louisiana's 70 districts have a row in JHU's 2024–25 draft
    // data — essentially complete, not the sparse partial-reporting pattern
    // an earlier illustrative pass here assumed.
    reporting: "69 of 70",
    hasRealGeo: true,
    regions: [
      // ALL 69 real reporting districts, not just the top ones — the map
      // colors whatever's in this list, so a partial list here would leave
      // the map looking sparse even though "69 of 70" is the real, complete
      // count. Names match la-districts.json's `properties.name` exactly —
      // the excel spells most of these bare ("Calcasieu") or with "Saint"
      // spelled out ("Saint Tammany"); the TIGER geometry uses "X Parish" /
      // "St. X Parish", so names here are normalized to the geometry's form.
      { name: "Calcasieu Parish", values: { "2024–25": 1445 } },
      { name: "St. Tammany Parish", values: { "2024–25": 1277 } },
      { name: "Lafayette Parish", values: { "2024–25": 1061 } },
      { name: "Livingston Parish", values: { "2024–25": 1053 } },
      { name: "East Baton Rouge Parish", values: { "2024–25": 918 } },
      { name: "Tangipahoa Parish", values: { "2024–25": 665 } },
      { name: "Jefferson Parish", values: { "2024–25": 609 } },
      { name: "Caddo Parish", values: { "2024–25": 584 } },
      { name: "Ouachita Parish", values: { "2024–25": 523 } },
      { name: "St. Landry Parish", values: { "2024–25": 501 } },
      { name: "Rapides Parish", values: { "2024–25": 469 } },
      { name: "Bossier Parish", values: { "2024–25": 464 } },
      { name: "Vernon Parish", values: { "2024–25": 453 } },
      { name: "Acadia Parish", values: { "2024–25": 413 } },
      { name: "Ascension Parish", values: { "2024–25": 406 } },
      { name: "Orleans Parish", values: { "2024–25": 364 } },
      { name: "Terrebonne Parish", values: { "2024–25": 340 } },
      { name: "Vermilion Parish", values: { "2024–25": 338 } },
      { name: "Iberia Parish", values: { "2024–25": 321 } },
      { name: "Beauregard Parish", values: { "2024–25": 319 } },
      { name: "Lafourche Parish", values: { "2024–25": 304 } },
      { name: "Natchitoches Parish", values: { "2024–25": 291 } },
      { name: "St. Martin Parish", values: { "2024–25": 204 } },
      { name: "Sabine Parish", values: { "2024–25": 200 } },
      { name: "Jefferson Davis Parish", values: { "2024–25": 180 } },
      { name: "Webster Parish", values: { "2024–25": 176 } },
      { name: "Lincoln Parish", values: { "2024–25": 174 } },
      { name: "Avoyelles Parish", values: { "2024–25": 171 } },
      { name: "St. Mary Parish", values: { "2024–25": 167 } },
      { name: "Allen Parish", values: { "2024–25": 154 } },
      { name: "West Carroll Parish", values: { "2024–25": 143 } },
      { name: "De Soto Parish", values: { "2024–25": 141 } },
      { name: "Jackson Parish", values: { "2024–25": 134 } },
      { name: "St. Bernard Parish", values: { "2024–25": 133 } },
      { name: "Washington Parish", values: { "2024–25": 130 } },
      { name: "Evangeline Parish", values: { "2024–25": 124 } },
      { name: "St. Charles Parish", values: { "2024–25": 122 } },
      { name: "Grant Parish", values: { "2024–25": 115 } },
      { name: "East Feliciana Parish", values: { "2024–25": 104 } },
      { name: "Union Parish", values: { "2024–25": 104 } },
      { name: "Assumption Parish", values: { "2024–25": 97 } },
      { name: "St. John the Baptist Parish", values: { "2024–25": 97 } },
      { name: "Bienville Parish", values: { "2024–25": 90 } },
      { name: "Franklin Parish", values: { "2024–25": 89 } },
      { name: "La Salle Parish", values: { "2024–25": 88 } },
      { name: "West Baton Rouge Parish", values: { "2024–25": 88 } },
      { name: "Central Community", values: { "2024–25": 83 } },
      { name: "Plaquemines Parish", values: { "2024–25": 83 } },
      { name: "Richland Parish", values: { "2024–25": 77 } },
      { name: "Winn Parish", values: { "2024–25": 76 } },
      { name: "Monroe City", values: { "2024–25": 72 } },
      { name: "Red River Parish", values: { "2024–25": 71 } },
      { name: "Morehouse Parish", values: { "2024–25": 70 } },
      { name: "St. Helena Parish", values: { "2024–25": 55 } },
      { name: "Caldwell Parish", values: { "2024–25": 50 } },
      { name: "Catahoula Parish", values: { "2024–25": 46 } },
      { name: "Iberville Parish", values: { "2024–25": 43 } },
      { name: "Zachary Community", values: { "2024–25": 42 } },
      { name: "Madison Parish", values: { "2024–25": 41 } },
      { name: "Pointe Coupee Parish", values: { "2024–25": 41 } },
      { name: "West Feliciana Parish", values: { "2024–25": 41 } },
      { name: "Claiborne Parish", values: { "2024–25": 39 } },
      { name: "Concordia Parish", values: { "2024–25": 37 } },
      { name: "St. James Parish", values: { "2024–25": 35 } },
      { name: "Tensas Parish", values: { "2024–25": 35 } },
      { name: "Cameron Parish", values: { "2024–25": 27 } },
      { name: "Baker City", values: { "2024–25": 12 } },
      { name: "Bogalusa City", values: { "2024–25": 12 } },
      { name: "East Carroll Parish", values: { "2024–25": 11 } },
    ],
    // No demographic breakdown anywhere in JHU's draft for Louisiana —
    // checked directly (grade/gender/race columns are blank for all 762
    // Louisiana rows). An earlier illustrative pass here invented a grade
    // breakdown; removed rather than left in, since there's no real basis
    // for it at all (unlike Georgia's empty state, which is at least
    // consistent with Georgia's own real blank columns).
    demographics: {},
    context: {
      sportsAccess: { value: "Yes" },
      courseAccess: { value: "No" },
      extracurricularAccess: { value: "Yes" },
      publicFunding: { value: "Yes" },
    },
  },
};

export const DEFAULT_EXPLORER_STATE = "LA";
