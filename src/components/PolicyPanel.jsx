/**
 * PolicyPanel — the regulation topic's card + data regions.
 *
 * Mirrors EnrollmentPanel's shape so it drops into the same shell grid: a
 * summary CARD top-right beside the map, and the DATA zone (the wide, side-by-
 * side regulation comparison table) spanning full width below. Reads the cohort
 * from the shared selection; removal happens via the shared chips above the map.
 *
 * All regulation data comes through the policy loader, never the CSV directly.
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

export default function PolicyPanel() {
  const { selectedStates } = useSelection();

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
        />
      </div>
    </>
  );
}
