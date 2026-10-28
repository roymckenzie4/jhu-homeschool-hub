/**
 * Which states State Explorer covers, and the real boundary file for each —
 * shared so Enrollment/Regulation can check "does this state have a State
 * Explorer page?" without pulling in the ~1.7MB snapshot (see
 * stateExplorerLoader.js's own lazy-load comment). StateExplorerPanel.jsx
 * imports GEO_FILE_BY_STATE from here rather than owning its own copy, so
 * the two lists can't drift apart.
 *
 * Every MAP_MATCHED state from build-state-explorer-snapshot.mjs needs an
 * entry here too — a state present in the snapshot but missing from this
 * list silently shows whichever OTHER state's map was fetched last (see
 * StateExplorerPanel's RegionMap) rather than erroring.
 */

export const GEO_FILE_BY_STATE = {
  DE: "de-districts.json",
  HI: "hi-districts.json",
  GA: "ga-districts.json",
  LA: "la-districts.json",
  AR: "ar-counties.json",
  FL: "fl-counties.json",
  MD: "md-counties.json",
  MN: "mn-counties.json",
  MT: "mt-counties.json",
  ND: "nd-counties.json",
  NE: "ne-counties.json",
  OH: "oh-districts.json",
  WA: "wa-counties.json",
  NC: "nc-counties.json",
  SC: "sc-districts.json",
  SD: "sd-districts.json",
  NY: "ny-districts.json",
  PA: "pa-districts.json",
  TN: "tn-districts.json",
  CO: "co-districts.json",
  WY: "wy-districts.json",
  RI: "ri-districts.json",
  MA: "ma-towns.json",
  NH: "nh-districts.json",
  NM: "nm-districts.json",
  WI: "wi-districts.json",
  ME: "me-districts.json",
};

// Postal codes State Explorer covers at all — the cross-link check (and
// anything else that just needs "is this state in State Explorer?") doesn't
// need the per-state filename, just membership.
export const STATE_EXPLORER_CODES = new Set(Object.keys(GEO_FILE_BY_STATE));
