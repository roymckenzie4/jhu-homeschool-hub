/**
 * PolicyPanel — the regulation topic's card + data regions.
 *
 * Mirrors EnrollmentPanel's shape so it drops into the same shell grid: a
 * summary CARD top-right beside the map, and the DATA zone (the wide, side-by-
 * side regulation comparison table) spanning full width below. Reads the cohort
 * from the shared selection and dispatches per-row removal back through it.
 *
 * The card is a placeholder for now — the per-state regulation summary lands
 * here once its shape is settled against the real layout. All regulation data
 * comes through the policy loader, never the CSV directly.
 */

import { useSelection } from "../state/selection.jsx";
import { policyByState } from "../data/policyLoader.js";
import {
  CARD_SLOT_CLASS,
  DATA_SLOT_CLASS,
  DATA_ZONE_MIN_HEIGHT,
} from "../config/layout.js";
import PolicyComparisonTable from "./PolicyComparisonTable.jsx";
import { trackEvent } from "../lib/analytics.js";

export default function PolicyPanel() {
  const { selectedStates, toggleState } = useSelection();

  // Removing a state from within the table logs under this topic, matching the
  // shell map's selection events.
  function removeState(name) {
    toggleState(name);
    trackEvent("state_select", { view: "policy", state: name });
  }

  return (
    <>
      {/* Placeholder card — a per-state regulation summary replaces this once
          its layout is settled. Copy stands in so the slot reads intentionally
          rather than as an empty gutter beside the map. */}
      <div className={CARD_SLOT_CLASS}>
        <aside className="flex h-full flex-col border border-l-4 border-sable/10 border-l-heritage bg-white px-6 py-4">
          <h3 className="font-sans text-lg font-semibold text-sable">
            State regulation
          </h3>
          <p className="mt-3 font-sans text-xs leading-relaxed text-sable/70">
            Select states on the map to compare how they regulate homeschooling
            across ten policy areas. A per-state summary of each selected state's
            requirements will appear here.
          </p>
        </aside>
      </div>

      <div
        className={`${DATA_SLOT_CLASS} flex flex-col`}
        style={{ minHeight: DATA_ZONE_MIN_HEIGHT }}
      >
        <PolicyComparisonTable
          selectedStates={selectedStates}
          policyByState={policyByState}
          onRemove={removeState}
        />
      </div>
    </>
  );
}
