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
import PolicyCard from "./PolicyCard.jsx";
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
      {/* Summary card — pinned to the map's height (relative cell + absolute
          fill), matching the enrollment card slot so the top section stays a
          constant height across tabs. */}
      <div className={`${CARD_SLOT_CLASS} lg:relative`}>
        <div className="lg:absolute lg:inset-0">
          <PolicyCard
            selectedStates={selectedStates}
            policyByState={policyByState}
          />
        </div>
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
