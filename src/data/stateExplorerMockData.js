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
 */

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
      { name: "Central", value: 942 },
      { name: "Leeward", value: 723 },
      { name: "Hawaii", value: 667 },
      { name: "Windward", value: 397 },
      { name: "Maui", value: 389 },
      { name: "Honolulu", value: 284 },
      { name: "Kauai", value: 201 },
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
      { name: "Gwinnett", value: 5369 },
      { name: "Cobb", value: 4031 },
      { name: "Cherokee", value: 3570 },
      { name: "Fulton", value: 2973 },
      { name: "DeKalb", value: 2304 },
      { name: "Paulding", value: 2233 },
      { name: "Forsyth", value: 2190 },
      { name: "Coweta", value: 2161 },
      { name: "Henry", value: 2075 },
      { name: "Columbia", value: 2023 },
      { name: "Houston", value: 1615 },
      { name: "Hall", value: 1613 },
      { name: "Richmond", value: 1515 },
      { name: "Carroll", value: 1514 },
      { name: "Fayette", value: 1501 },
      { name: "Walton", value: 1488 },
      { name: "Muscogee", value: 1414 },
      { name: "Bartow", value: 1411 },
      { name: "Newton", value: 1280 },
      { name: "Douglas", value: 1264 },
      { name: "Effingham", value: 1147 },
      { name: "Barrow", value: 1129 },
      { name: "Clayton", value: 1112 },
      { name: "Walker", value: 1049 },
      { name: "Jackson", value: 1010 },
      { name: "Floyd", value: 940 },
      { name: "Glynn", value: 883 },
      { name: "Bibb", value: 854 },
      { name: "Pickens", value: 819 },
      { name: "Catoosa", value: 813 },
      { name: "Lowndes", value: 795 },
      { name: "Camden", value: 738 },
      { name: "Rockdale", value: 688 },
      { name: "Bryan", value: 682 },
      { name: "Whitfield", value: 658 },
      { name: "Liberty", value: 645 },
      { name: "Bulloch", value: 638 },
      { name: "Clarke", value: 638 },
      { name: "Gordon", value: 608 },
      { name: "Harris", value: 591 },
      { name: "Habersham", value: 588 },
      { name: "Troup", value: 559 },
      { name: "Murray", value: 553 },
      { name: "Polk", value: 549 },
      { name: "Dawson", value: 506 },
      { name: "Franklin", value: 499 },
      { name: "Madison", value: 492 },
      { name: "Oconee", value: 475 },
      { name: "Stephens", value: 473 },
      { name: "Haralson", value: 466 },
      { name: "Gilmer", value: 464 },
      { name: "Lumpkin", value: 457 },
      { name: "Hart", value: 453 },
      { name: "Laurens", value: 407 },
      { name: "White", value: 403 },
      { name: "Union", value: 398 },
      { name: "Dougherty", value: 389 },
      { name: "Fannin", value: 374 },
      { name: "Colquitt", value: 366 },
      { name: "Monroe", value: 362 },
      { name: "Pike", value: 359 },
      { name: "Chattooga", value: 357 },
      { name: "Coffee", value: 343 },
      { name: "Tift", value: 342 },
      { name: "Meriwether", value: 338 },
      { name: "Ware", value: 333 },
      { name: "Dade", value: 331 },
      { name: "Banks", value: 328 },
      { name: "Long", value: 318 },
      { name: "Wayne", value: 318 },
      { name: "Jasper", value: 307 },
      { name: "Thomas", value: 306 },
      { name: "Lamar", value: 304 },
      { name: "Lee", value: 298 },
      { name: "McDuffie", value: 289 },
      { name: "Butts", value: 287 },
      { name: "Morgan", value: 284 },
      { name: "Pierce", value: 283 },
      { name: "Brantley", value: 276 },
      { name: "Peach", value: 267 },
      { name: "Burke", value: 257 },
      { name: "Elbert", value: 256 },
      { name: "Baldwin", value: 254 },
      { name: "Jones", value: 233 },
      { name: "Crawford", value: 229 },
      { name: "Toombs", value: 229 },
      { name: "Rabun", value: 220 },
      { name: "Oglethorpe", value: 218 },
      { name: "Grady", value: 208 },
      { name: "Emanuel", value: 197 },
      { name: "Tattnall", value: 197 },
      { name: "Decatur", value: 192 },
      { name: "Cook", value: 170 },
      { name: "Appling", value: 164 },
      { name: "Berrien", value: 164 },
      { name: "Putnam", value: 161 },
      { name: "Towns", value: 155 },
      { name: "Macon", value: 151 },
      { name: "Dodge", value: 147 },
      { name: "Brooks", value: 141 },
      { name: "Charlton", value: 141 },
      { name: "Heard", value: 141 },
      { name: "Worth", value: 141 },
      { name: "Screven", value: 137 },
      { name: "Crisp", value: 134 },
      { name: "Mitchell", value: 134 },
      { name: "Sumter", value: 134 },
      { name: "Ben Hill", value: 131 },
      { name: "Lanier", value: 127 },
      { name: "Wilkes", value: 123 },
      { name: "Bacon", value: 120 },
      { name: "Washington", value: 120 },
      { name: "Jefferson", value: 115 },
      { name: "Evans", value: 112 },
      { name: "Jeff Davis", value: 110 },
      { name: "Lincoln", value: 106 },
      { name: "Wilkinson", value: 104 },
      { name: "Telfair", value: 101 },
      { name: "Greene", value: 98 },
      { name: "Bleckley", value: 96 },
      { name: "Chattahoochee", value: 96 },
      { name: "Irwin", value: 95 },
      { name: "Johnson", value: 94 },
      { name: "McIntosh", value: 93 },
      { name: "Montgomery", value: 93 },
      { name: "Marion", value: 89 },
      { name: "Turner", value: 89 },
      { name: "Candler", value: 82 },
      { name: "Twiggs", value: 82 },
      { name: "Dooly", value: 79 },
      { name: "Pulaski", value: 71 },
      { name: "Taylor", value: 71 },
      { name: "Miller", value: 69 },
      { name: "Wilcox", value: 67 },
      { name: "Jenkins", value: 66 },
      { name: "Treutlen", value: 64 },
      { name: "Schley", value: 63 },
      { name: "Terrell", value: 60 },
      { name: "Hancock", value: 59 },
      { name: "Atkinson", value: 56 },
      { name: "Seminole", value: 51 },
      { name: "Talbot", value: 51 },
      { name: "Wheeler", value: 50 },
      { name: "Early", value: 41 },
      { name: "Taliaferro", value: 41 },
      { name: "Clinch", value: 35 },
      { name: "Stewart", value: 34 },
      { name: "Baker", value: 32 },
      { name: "Calhoun", value: 28 },
      { name: "Warren", value: 28 },
      { name: "Glascock", value: 27 },
      { name: "Echols", value: 26 },
      { name: "Randolph", value: 25 },
      { name: "Clay", value: 13 },
      { name: "Quitman", value: 13 },
      { name: "Webster", value: 2 },
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
      { name: "Calcasieu Parish", value: 1445 },
      { name: "St. Tammany Parish", value: 1277 },
      { name: "Lafayette Parish", value: 1061 },
      { name: "Livingston Parish", value: 1053 },
      { name: "East Baton Rouge Parish", value: 918 },
      { name: "Tangipahoa Parish", value: 665 },
      { name: "Jefferson Parish", value: 609 },
      { name: "Caddo Parish", value: 584 },
      { name: "Ouachita Parish", value: 523 },
      { name: "St. Landry Parish", value: 501 },
      { name: "Rapides Parish", value: 469 },
      { name: "Bossier Parish", value: 464 },
      { name: "Vernon Parish", value: 453 },
      { name: "Acadia Parish", value: 413 },
      { name: "Ascension Parish", value: 406 },
      { name: "Orleans Parish", value: 364 },
      { name: "Terrebonne Parish", value: 340 },
      { name: "Vermilion Parish", value: 338 },
      { name: "Iberia Parish", value: 321 },
      { name: "Beauregard Parish", value: 319 },
      { name: "Lafourche Parish", value: 304 },
      { name: "Natchitoches Parish", value: 291 },
      { name: "St. Martin Parish", value: 204 },
      { name: "Sabine Parish", value: 200 },
      { name: "Jefferson Davis Parish", value: 180 },
      { name: "Webster Parish", value: 176 },
      { name: "Lincoln Parish", value: 174 },
      { name: "Avoyelles Parish", value: 171 },
      { name: "St. Mary Parish", value: 167 },
      { name: "Allen Parish", value: 154 },
      { name: "West Carroll Parish", value: 143 },
      { name: "De Soto Parish", value: 141 },
      { name: "Jackson Parish", value: 134 },
      { name: "St. Bernard Parish", value: 133 },
      { name: "Washington Parish", value: 130 },
      { name: "Evangeline Parish", value: 124 },
      { name: "St. Charles Parish", value: 122 },
      { name: "Grant Parish", value: 115 },
      { name: "East Feliciana Parish", value: 104 },
      { name: "Union Parish", value: 104 },
      { name: "Assumption Parish", value: 97 },
      { name: "St. John the Baptist Parish", value: 97 },
      { name: "Bienville Parish", value: 90 },
      { name: "Franklin Parish", value: 89 },
      { name: "La Salle Parish", value: 88 },
      { name: "West Baton Rouge Parish", value: 88 },
      { name: "Central Community", value: 83 },
      { name: "Plaquemines Parish", value: 83 },
      { name: "Richland Parish", value: 77 },
      { name: "Winn Parish", value: 76 },
      { name: "Monroe City", value: 72 },
      { name: "Red River Parish", value: 71 },
      { name: "Morehouse Parish", value: 70 },
      { name: "St. Helena Parish", value: 55 },
      { name: "Caldwell Parish", value: 50 },
      { name: "Catahoula Parish", value: 46 },
      { name: "Iberville Parish", value: 43 },
      { name: "Zachary Community", value: 42 },
      { name: "Madison Parish", value: 41 },
      { name: "Pointe Coupee Parish", value: 41 },
      { name: "West Feliciana Parish", value: 41 },
      { name: "Claiborne Parish", value: 39 },
      { name: "Concordia Parish", value: 37 },
      { name: "St. James Parish", value: 35 },
      { name: "Tensas Parish", value: 35 },
      { name: "Cameron Parish", value: 27 },
      { name: "Baker City", value: 12 },
      { name: "Bogalusa City", value: 12 },
      { name: "East Carroll Parish", value: 11 },
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
