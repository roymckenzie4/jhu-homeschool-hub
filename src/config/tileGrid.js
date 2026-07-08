/**
 * Tile-grid layout for the map's 'tile' render mode.
 *
 * The tile map trades geographic accuracy for a same-size square per state, so
 * small states (the New England cluster, DC) are as easy to click as Texas.
 * ChoroplethMap consumes this to render one rounded tile per state instead of a
 * projected path; every other prop (fills, selection, a11y) is identical to the
 * geographic mode.
 *
 * Layout: the standard NPR US tile grid, 8 rows x 12 columns, 50 states + DC.
 * `row 0` is the top. AK and HI sit in a detached offshore column on the far left
 * (col 0), with the mainland body in cols 1-11. The eastern seaboard attaches
 * directly to the body, so nothing floats: NY/NJ/MD/DC form the spine, VT/RI/CT/DE
 * the next column out, and ME/NH/MA the far-right coastal column. Tiles are ~19%
 * wider than tall (see TILE_W/TILE_H) so the 12-wide grid reads short and wide.
 * Positions read geographically — Pacific coast on the left, New England top-right,
 * Gulf/Florida bottom.
 *
 * Keyed by postal code (matches config/states.js). To retune a placement, edit
 * the { row, col } here — nothing else needs to change.
 */

// Which map the app renders. This is a build/config choice, NOT a user-facing
// toggle: each deploy ships exactly one map so JHU can A/B the two URLs.
// 'geo'  — geographic choropleth (mainline default)
// 'tile' — square tile grid (the reorg branch flips this)
// One-line flip per deploy; greppable by name.
export const MAP_MODE = "tile";

// Grid dimensions. Drive the map's viewBox and label sizing in tile mode.
export const GRID_COLS = 12;
export const GRID_ROWS = 8;

// Per-tile geometry, in the map's internal SVG units. TILE_W / TILE_H are the
// cell footprint (edge-to-edge including the gap); TILE_GAP is the white channel
// between neighbours, so the drawn tile is (TILE_W - TILE_GAP) x (TILE_H -
// TILE_GAP). TILE_W > TILE_H makes each tile ~19% wider than tall, which lifts
// the compact 11x8 grid's aspect ratio (1.375 square) up to ~geo's (1.65) so the
// map fills the same wide footprint. The viewBox scales to the container width,
// so these set proportions more than absolute pixels. Nudge TILE_W to retune the
// height. TILE_RADIUS rounds the corners just enough to feel like a chip.
export const TILE_W = 70;
export const TILE_H = 54;

// Extra viewBox height below the grid so the tiles don't crowd the legend that
// sits beneath the map. In tile-map units; scales with the map.
export const TILE_BOTTOM_PAD = 26;
export const TILE_GAP = 6;
export const TILE_RADIUS = 4;

// Hover "pop" — tile-mode only (a geo path can't scale the same way, so this
// never touches the geo hover glow). On hover the tile scales up around its own
// center and gains a stronger fill-darken + a real drop shadow, so it reads as
// lifting off the grid. Kept small enough that the grown tile stays inside
// TILE_GAP and doesn't overlap its neighbours; only the soft shadow spills, and
// the hovered tile is drawn last so that shadow isn't clipped.
export const TILE_HOVER_SCALE = 1.06; // 1 = no growth
// Multiplier on the fill's RGB channels; < 1 darkens. Stronger than the geo
// hover glow's 0.90 so the pop reads on the light end of the ramp too.
export const TILE_HOVER_DARKEN = 0.82;
// Drop shadow under the lifted tile, in tile-map units (scales with the map).
export const TILE_HOVER_SHADOW_DY = 2;
export const TILE_HOVER_SHADOW_BLUR = 3;
export const TILE_HOVER_SHADOW_OPACITY = 0.35;

// Selection border for tile mode. A crisp near-black border reads as a
// deliberate "selected" state against every fill on the ramp, framed by the
// white channel between tiles. Tile-only: geo keeps its topic-colored ring +
// soft white halo (selectionStroke), which a square border would read as flat.
export const TILE_SELECT_STROKE = "#1F1A14";
export const TILE_SELECT_RING_W = 3;

// Postal -> grid cell. 50 states + DC = 51 entries.
export const TILE_GRID = {
  AK: { row: 0, col: 0 },
  ME: { row: 0, col: 11 },

  VT: { row: 1, col: 10 },
  NH: { row: 1, col: 11 },

  WA: { row: 2, col: 1 },
  ID: { row: 2, col: 2 },
  MT: { row: 2, col: 3 },
  ND: { row: 2, col: 4 },
  MN: { row: 2, col: 5 },
  IL: { row: 2, col: 6 },
  WI: { row: 2, col: 7 },
  MI: { row: 2, col: 8 },
  NY: { row: 2, col: 9 },
  RI: { row: 2, col: 10 },
  MA: { row: 2, col: 11 },

  OR: { row: 3, col: 1 },
  NV: { row: 3, col: 2 },
  WY: { row: 3, col: 3 },
  SD: { row: 3, col: 4 },
  IA: { row: 3, col: 5 },
  IN: { row: 3, col: 6 },
  OH: { row: 3, col: 7 },
  PA: { row: 3, col: 8 },
  NJ: { row: 3, col: 9 },
  CT: { row: 3, col: 10 },

  CA: { row: 4, col: 1 },
  UT: { row: 4, col: 2 },
  CO: { row: 4, col: 3 },
  NE: { row: 4, col: 4 },
  MO: { row: 4, col: 5 },
  KY: { row: 4, col: 6 },
  WV: { row: 4, col: 7 },
  VA: { row: 4, col: 8 },
  MD: { row: 4, col: 9 },
  DE: { row: 4, col: 10 },

  AZ: { row: 5, col: 2 },
  NM: { row: 5, col: 3 },
  KS: { row: 5, col: 4 },
  AR: { row: 5, col: 5 },
  TN: { row: 5, col: 6 },
  NC: { row: 5, col: 7 },
  SC: { row: 5, col: 8 },
  DC: { row: 5, col: 9 },

  OK: { row: 6, col: 4 },
  LA: { row: 6, col: 5 },
  MS: { row: 6, col: 6 },
  AL: { row: 6, col: 7 },
  GA: { row: 6, col: 8 },

  HI: { row: 7, col: 0 },
  TX: { row: 7, col: 4 },
  FL: { row: 7, col: 9 },
};
