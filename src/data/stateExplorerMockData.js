/**
 * Placeholder data for the Phase 2 "State Explorer" concept tab.
 *
 * NOT a real loader — hand-authored sample numbers, not wired to any snapshot
 * or CSV. JHU's underlying data shape (wide vs. long) and sub-state geography
 * approach (county/district/town, standardized across states or left
 * per-state) are both still being decided as of Sept 2026; this exists so the
 * concept can be reviewed in the real app without committing to either answer
 * yet. Delete/replace wholesale once a real data pipeline for this view exists.
 *
 * The four states here mirror the actual sparsity found in JHU's own draft
 * collection template: most states have only a handful of populated fields,
 * and sub-state geography + demographic breakdowns rarely overlap. Real state
 * names, illustrative numbers. Deliberately cover all four combinations of
 * (real map?) x (demographic breakdown?) so the layout holds up regardless of
 * which pieces a given state actually has: Hawaii (list only, no map;
 * demographics), Delaware (no map, no list; demographics), Georgia (real map
 * + list; no demographics), Louisiana (real map + list; demographics).
 */

export const EXPLORER_STATES = {
  HI: {
    name: "Hawaii",
    total: 2140,
    year: "2024–25",
    // Matches JHU's draft: Hawaii is one of the only states with BOTH a
    // sub-state breakdown and a demographic breakdown reported (district +
    // gender) — everywhere else in the draft, it's one or the other.
    //
    // No map for Hawaii: its "districts" are HIDOE "complex areas," an
    // internal administrative division — checked, and the real federal
    // source (Census/NCES TIGER school-district boundaries) has exactly ONE
    // feature for Hawaii ("Hawaii Department of Education", the whole state
    // as a single legal district). Complex-area boundaries aren't published
    // federal geography, so there's no real shape to draw — the ranked list
    // below is real information on its own; a fabricated map would not be.
    geoUnit: "district",
    geoLabel: "districts",
    reporting: "6 of 7",
    regions: [
      { name: "Honolulu", value: 940 },
      { name: "Hawaii", value: 410 },
      { name: "Maui", value: 380 },
      { name: "Kauai", value: 260 },
      { name: "Central Oahu", value: 150 },
      { name: "Windward Oahu", value: 0 },
    ],
    demographics: {
      gender: [
        { label: "Female", pct: 52 },
        { label: "Male", pct: 46 },
        { label: "Not specified", pct: 2 },
      ],
    },
  },
  DE: {
    name: "Delaware",
    total: 1860,
    year: "2024–25",
    // No sub-state geography reported yet.
    geoUnit: null,
    geoLabel: null,
    reporting: null,
    regions: null,
    demographics: {
      grade: [
        { label: "Elementary (K–5)", pct: 48 },
        { label: "Middle (6–8)", pct: 29 },
        { label: "High (9–12)", pct: 23 },
      ],
      race: [
        { label: "White", pct: 61 },
        { label: "Black", pct: 18 },
        { label: "Multiracial", pct: 11 },
        { label: "Asian", pct: 5 },
        { label: "Other / not specified", pct: 5 },
      ],
    },
  },
  GA: {
    name: "Georgia",
    total: 89510,
    year: "2024–25",
    // Real county boundaries (US Census/us-atlas), pruned to just Georgia —
    // see src/data/stateExplorerGeo/ga-counties.json and
    // lib/geoProjection.js's buildStateProjection. JHU's real draft data
    // reports Georgia by DISTRICT, not county — district boundaries were
    // validated separately (Census/NCES TIGER, see ~/Active/work/jhu/sketches/
    // phase2-map-spike/) but not yet wired in per-state. County is shown here
    // as the fully-proven path; swapping to district for Georgia is the same
    // rendering code, just a different geometry file.
    geoUnit: "county",
    geoLabel: "counties",
    reporting: "28 of 159",
    hasRealGeo: true,
    regions: [
      // Names match us-atlas's `properties.name` exactly (bare county name,
      // no "County" suffix) so they can be joined to the real geometry. A
      // wider real-county spread than the first pass (was 6) so the map
      // reads as genuinely partial data across the state, not a broken map
      // with almost everything gray.
      { name: "Gwinnett", value: 5210 },
      { name: "Cobb", value: 4380 },
      { name: "Fulton", value: 3960 },
      { name: "DeKalb", value: 3120 },
      { name: "Cherokee", value: 2540 },
      { name: "Forsyth", value: 1980 },
      { name: "Henry", value: 1720 },
      { name: "Paulding", value: 1540 },
      { name: "Hall", value: 1410 },
      { name: "Coweta", value: 1280 },
      { name: "Fayette", value: 1150 },
      { name: "Bartow", value: 1040 },
      { name: "Douglas", value: 970 },
      { name: "Clayton", value: 890 },
      { name: "Newton", value: 820 },
      { name: "Walton", value: 760 },
      { name: "Barrow", value: 700 },
      { name: "Columbia", value: 650 },
      { name: "Richmond", value: 600 },
      { name: "Muscogee", value: 560 },
      { name: "Chatham", value: 520 },
      { name: "Houston", value: 480 },
      { name: "Bibb", value: 440 },
      { name: "Dougherty", value: 400 },
      { name: "Whitfield", value: 360 },
      { name: "Carroll", value: 330 },
      { name: "Rockdale", value: 300 },
      { name: "Troup", value: 270 },
    ],
    // No demographic breakdown reported yet.
    demographics: {},
  },
  LA: {
    name: "Louisiana",
    total: 14380,
    year: "2024–25",
    // Real district boundaries (Census/NCES TIGER UNSD, current as of TIGER2024),
    // converted with mapshaper — see public/state-explorer-geo/la-districts.json.
    // 69 real districts (64 parishes + 5 independent city/community districts:
    // Baker City, Bogalusa City, Central Community, Monroe City, Zachary
    // Community). Second proof that the district pipeline (validated for
    // Georgia in the spike) repeats cleanly for a different state — Louisiana
    // is one of JHU's own real district-reporting states (CO/GA/ME/LA/HI) for
    // JHU's own internal categorization, but the geoUnit below is
    // Louisiana's own local term for the unit ("parish"), the same way
    // Georgia's is displayed as "county" rather than "unified school
    // district" — the underlying geometry is still UNSD/district-level TIGER
    // data either way.
    geoUnit: "parish",
    geoLabel: "parishes",
    reporting: "18 of 69",
    hasRealGeo: true,
    regions: [
      // Names match la-districts.json's `properties.name` exactly (the raw
      // TIGER name with " School District" stripped) so they join to the real
      // geometry the same way Georgia's county names do.
      { name: "Orleans Parish", value: 2140 },
      { name: "Jefferson Parish", value: 1860 },
      { name: "East Baton Rouge Parish", value: 1610 },
      { name: "Caddo Parish", value: 1180 },
      { name: "Calcasieu Parish", value: 980 },
      { name: "Lafayette Parish", value: 870 },
      { name: "St. Tammany Parish", value: 810 },
      { name: "Ouachita Parish", value: 640 },
      { name: "Rapides Parish", value: 590 },
      { name: "Livingston Parish", value: 540 },
      { name: "Tangipahoa Parish", value: 490 },
      { name: "St. Landry Parish", value: 430 },
      { name: "Terrebonne Parish", value: 400 },
      { name: "Bossier Parish", value: 360 },
      { name: "Iberia Parish", value: 320 },
      { name: "Ascension Parish", value: 280 },
      { name: "Natchitoches Parish", value: 240 },
      { name: "Zachary Community", value: 0 },
    ],
    // A real demographic breakdown alongside a real map — the fourth
    // combination the redesign needs to hold up under (Hawaii: list + demo,
    // no map; Delaware: demo, no map or list; Georgia: map, no demo).
    demographics: {
      grade: [
        { label: "Elementary (K–5)", pct: 51 },
        { label: "Middle (6–8)", pct: 27 },
        { label: "High (9–12)", pct: 22 },
      ],
    },
  },
};

export const DEFAULT_EXPLORER_STATE = "LA";
