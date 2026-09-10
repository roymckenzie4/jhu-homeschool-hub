/**
 * Layout dimensions for the fixed-frame scaffolding.
 *
 * The app is designed to live in a fixed-height WordPress iframe, so we build
 * to a target height rather than letting content dictate it. The "fixed" lives
 * at the view level: each view is a flex column at least TARGET_HEIGHT tall with
 * its footer pinned to the bottom, so short content leaves clean whitespace
 * (not an empty box) and the tables inside size naturally to their rows.
 *
 * This is the single place to retune the frame — most importantly, TARGET_HEIGHT
 * will be swapped for the real iframe dimensions once JHU provides them.
 */

// Target view height (the eventual iframe height). Provisional — used as a
// min-height so a view never collapses shorter than the frame; taller content
// (e.g. a full six-state comparison) grows past it and the page scrolls.
export const TARGET_HEIGHT = 760;

// Fixed height of the by-year enrollment table's scroll area. The table shows
// every reporting year (~26 rows), so it scrolls internally under a sticky
// header rather than growing the page. Fixing the height also keeps the left
// column a constant height across selections — a state with no year-by-year
// data shows a same-height placeholder instead of collapsing the layout.
//
// The data zone's trend graph is pinned to this SAME height, so the table and
// graph sit as one matched-height row (see EnrollmentPanel's data zone).
export const ENROLLMENT_TABLE_HEIGHT = 180;

// Grid placement for the shell's regions. The shell (App) lays out a two-column
// grid on lg across three rows: row 1 is the map top-left + the topic's summary
// card top-right; row 2 is the shared selection chip strip full-width; row 3 is
// the topic's data zone (table + graph, or the wide comparison table) full-width
// below. Each topic panel tags its card/data children with these so the shell's
// grid can place them without the panel owning the grid itself. On mobile the
// grid collapses to one column and these are inert — children flow map -> card
// -> chips -> data top to bottom.
export const CARD_SLOT_CLASS = "lg:col-start-2 lg:row-start-1";
export const CHIPS_SLOT_CLASS = "lg:col-span-2 lg:row-start-2";
export const DATA_SLOT_CLASS = "lg:col-span-2 lg:row-start-3";

// The 1.35:1 column ratio behind the shell's map/card row is deliberately
// reused by the Enrollment data zone's table/graph row (see EnrollmentPanel),
// so the map and the by-year table stay vertically aligned. One constant so
// the two grids can't drift apart — App.jsx adds its own margin on top.
export const TWO_COLUMN_GRID_CLASS =
  "grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]";

// State Explorer: fixed aspect-ratio box for the sub-state map slot (row 1,
// paired with a plain-text state headline — see StateExplorerPanel). Reused
// for EVERY state, whether it has a real map or not, so that row's height
// never changes when switching states — a state with no published boundaries
// renders a placeholder in the same box rather than collapsing the row.
// Deliberately the SAME aspect ratio as ChoroplethMap's national map
// (760x460, not exported from there since it's the only other consumer) —
// two reasons: it keeps this row the same height as the equivalent row on
// Enrollment/Regulation when switching tabs, and it's a wide-enough ratio to
// stay short at this column's width (a taller/more-portrait ratio, tried
// first, made row 1 noticeably taller than the rest of the app — a real
// problem given the whole tool has to fit a fixed-height iframe). The
// tradeoff is more visible letterboxing around portrait-leaning states
// (Georgia, Louisiana) than a state-tuned ratio would have — acceptable for
// a fixed, predictable frame.
export const EXPLORER_MAP_VIEW_W = 760;
export const EXPLORER_MAP_VIEW_H = 460;

// Reserved height for the map legend's own box under EXPLORER_MAP_VIEW_W/H —
// always held open in row 1's left column, whether the legend renders
// (Georgia, Louisiana — real boundaries) or not (Hawaii, Delaware —
// NoMapPlaceholder). Excludes the wrapping div's mt-4 top margin (16px),
// which still applies on its own regardless of this height — the combined
// 41px (16 margin + 25 box) is what was measured (getBoundingClientRect)
// as the actual gap between states with and without a legend before this
// fix existed; this constant is just the box's share of that 41px.
export const EXPLORER_LEGEND_SLOT_HEIGHT = 25;

// Min-height the data zone reserves regardless of content, so switching topics
// (or selecting a single state on Regulation, where the table is one short
// row) doesn't collapse the zone and resize the tool. Sized to the Enrollment
// data zone's natural height (an eyebrow heading + ENROLLMENT_TABLE_HEIGHT
// body), so Regulation's shorter table reserves the same space with
// whitespace below rather than fake rows. Provisional alongside
// TARGET_HEIGHT until real iframe dims.
export const DATA_ZONE_MIN_HEIGHT = ENROLLMENT_TABLE_HEIGHT + 28;
