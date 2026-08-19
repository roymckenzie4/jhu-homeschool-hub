/**
 * RegulationPanel — the regulation topic's card + data regions.
 *
 * Mirrors EnrollmentPanel's shape so it drops into the same shell grid: a
 * summary CARD top-right beside the map, and the DATA zone (the wide, side-by-
 * side regulation comparison table) spanning full width below. Reads the cohort
 * from the shared selection; removal happens via the shared chips above the map.
 *
 * All regulation data comes through the regulation loader, never the CSV directly.
 */

import { useSelection } from "../state/selection.jsx";
import { regulationByState } from "../data/regulationLoader.js";
import {
  CARD_SLOT_CLASS,
  DATA_SLOT_CLASS,
  DATA_ZONE_MIN_HEIGHT,
} from "../config/layout.js";
import { regulationCitation } from "../config/theme.js";
import { REGULATION_COUNT } from "../config/regulation.js";
import RegulationCard from "./RegulationCard.jsx";
import RegulationComparisonTable from "./RegulationComparisonTable.jsx";
import RegulationTableDownloadButton from "./RegulationTableDownloadButton.jsx";
import OnboardingPanel from "./OnboardingPanel.jsx";

export default function RegulationPanel() {
  const { selectedStates, clearAll } = useSelection();
  const count = selectedStates.length;

  return (
    <>
      {/* Summary card — pinned to the map's height (relative cell + absolute
          fill), matching the enrollment card slot so the top section stays a
          constant height across tabs. */}
      <div className={`${CARD_SLOT_CLASS} lg:relative`}>
        <div className="lg:absolute lg:inset-0">
          <RegulationCard
            selectedStates={selectedStates}
            regulationByState={regulationByState}
            onClear={clearAll}
          />
        </div>
      </div>

      <div
        className={`${DATA_SLOT_CLASS} flex flex-col`}
        style={{ minHeight: DATA_ZONE_MIN_HEIGHT }}
      >
        {/* Heading row carries the Save (PNG) export, right-aligned — shown only
            once a cohort exists, so the empty prompt stays uncluttered. */}
        {count > 0 && (
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
              Regulations Compared
            </h2>
            <RegulationTableDownloadButton
              selectedStates={selectedStates}
              regulationByState={regulationByState}
              title="State homeschool regulations compared"
              subtitle={`Comparing ${count} ${count === 1 ? "state" : "states"} · regulations in force, of ${REGULATION_COUNT} tracked`}
              citation={regulationCitation()}
              filename="homeschool-regulations-comparison.png"
            />
          </div>
        )}
        {count === 0 ? (
          <OnboardingPanel />
        ) : (
          <RegulationComparisonTable
            selectedStates={selectedStates}
            regulationByState={regulationByState}
          />
        )}
      </div>
    </>
  );
}
