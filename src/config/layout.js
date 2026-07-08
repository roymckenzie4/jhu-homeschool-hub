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

// Min-height the data zone reserves regardless of content, so switching topics
// (or selecting a single state on Policy, where the table is one short row)
// doesn't collapse the zone and resize the tool. Sized to the Enrollment data
// zone's natural height (an eyebrow heading + ENROLLMENT_TABLE_HEIGHT body), so
// Policy's shorter table reserves the same space with whitespace below rather
// than fake rows. Provisional alongside TARGET_HEIGHT until real iframe dims.
export const DATA_ZONE_MIN_HEIGHT = ENROLLMENT_TABLE_HEIGHT + 28;
