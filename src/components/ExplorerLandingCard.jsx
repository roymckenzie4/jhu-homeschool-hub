/**
 * State Explorer's 0-selected landing view — shown before any state is picked
 * in the Explore dropdown, instead of defaulting straight into one state's
 * drill-in with no visible "this is a choice" moment.
 *
 * Deliberately plain, no border — matches StateExplorerPanel's own
 * ExplorerHeadline convention (see that file's doc comment), not Enrollment/
 * Regulation's bordered SummaryCard. An earlier pass borrowed their "0
 * selected" shape wholesale (bordered card, aggregate total, leaderboard),
 * but Roy flagged that look as foreign to this tab and the counts as
 * unnecessary — this is just a prompt.
 *
 * Still reserves the SAME total footprint as a selected-state view — row 1's
 * map-box aspect ratio + legend slot, row 2's data-zone min-height — so
 * picking a state for the first time doesn't resize/jump the page inside the
 * fixed-height WordPress iframe (see config/layout.js).
 */

import {
  EXPLORER_MAP_VIEW_W,
  EXPLORER_MAP_VIEW_H,
  EXPLORER_LEGEND_SLOT_HEIGHT,
  DATA_ZONE_MIN_HEIGHT,
  TWO_COLUMN_GRID_CLASS,
} from "../config/layout.js";

export default function ExplorerLandingCard() {
  return (
    <div className="flex flex-col">
      <div className={`${TWO_COLUMN_GRID_CLASS} lg:items-center`}>
        <div>
          {/* Reserved aspect-ratio box, same as the real map's slot — empty
              rather than echoing the prompt on the right, so the message
              appears once, not twice. */}
          <div style={{ aspectRatio: `${EXPLORER_MAP_VIEW_W} / ${EXPLORER_MAP_VIEW_H}` }} />
          <div className="mt-4" style={{ height: EXPLORER_LEGEND_SLOT_HEIGHT }} />
        </div>

        {/* Plain typography, same as ExplorerHeadline's state-name heading +
            body text — no border/background. */}
        <div>
          <h3 className="font-sans text-2xl font-bold text-sable">State Explorer</h3>
          <p className="mt-3 font-sans text-sm leading-relaxed text-sable/70">
            Select a state above to explore its counties, districts, or
            towns.
          </p>
        </div>
      </div>

      {/* Row 2 — reserved at the same height a selected state's region table
          + demographics row would take, so there's no height jump into the
          first real selection. */}
      <div
        className={`mt-6 ${TWO_COLUMN_GRID_CLASS}`}
        style={{ minHeight: DATA_ZONE_MIN_HEIGHT }}
      >
        <div
          className="flex items-center justify-center px-3 text-center font-sans text-xs text-sable/70"
          style={{ minHeight: DATA_ZONE_MIN_HEIGHT }}
        >
          Region and demographic detail appear once a state is selected.
        </div>
      </div>
    </div>
  );
}
