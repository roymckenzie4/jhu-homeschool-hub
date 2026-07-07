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
export const ENROLLMENT_TABLE_HEIGHT = 180;
