/**
 * EnrollmentPanel — the enrollment topic's below-the-shell content.
 *
 * The unified shell (App) owns the shared map, legend, chip row, and the year
 * selector, and passes the active year down. This panel renders only what's
 * specific to enrollment below that: the detail card and the by-year table.
 *
 * The card is emergent from the shared selection: 0 selected -> national
 * overview, 1 -> that state's detail, 2+ -> comparison, 2+ with a focus -> the
 * focused state's detail with a "back to comparison" control. Selection itself
 * is dispatched by the shell's map; this panel only reads it and drives the
 * focus/back transitions.
 */

import { useMemo } from "react";
import { useSelection } from "../state/selection.jsx";
import {
  enrollmentByState as byState,
  enrollmentYears as years,
} from "../data/enrollmentLoader.js";
import { deriveByYear, topStatesForYear } from "../data/derive.js";
import { ENROLLMENT_TABLE_HEIGHT } from "../config/layout.js";
import StateDetailCard from "./StateDetailCard.jsx";
import NationalOverviewCard from "./NationalOverviewCard.jsx";
import EnrollmentComparisonCard from "./EnrollmentComparisonCard.jsx";
import EnrollmentTable from "./EnrollmentTable.jsx";

// Enrollment data comes shaped from the loader (parsed once, shared with the
// State policies view's Homeschoolers column). byYear aggregates are derived here.
const byYear = deriveByYear(byState);

// Number of states in the national-overview leaderboard.
const TOP_STATES_COUNT = 5;

export default function EnrollmentPanel({ activeYear }) {
  const { selectedStates, focusedState, clearAll, focusState, clearFocus } =
    useSelection();
  const count = selectedStates.length;

  // The state whose single detail is shown: the drill-in target when comparing,
  // else the sole selection. Null in the overview (0) and comparison (2+ with
  // no drill-in) modes — those render their own cards instead.
  const detailState = focusedState ?? (count === 1 ? selectedStates[0] : null);

  const yearStats = byYear[activeYear];
  const dcReporting =
    (byState["District of Columbia"]?.[activeYear] ?? null) != null;

  // Detail-card slices, keyed to the drill-in/single state (null in overview
  // and comparison modes, where these go unread).
  const detailValues = byState[detailState];
  const currentValue = detailValues?.[activeYear] ?? null;
  const previousValue = detailValues?.[activeYear - 1] ?? null;
  const rank = yearStats.rankByState[detailState] ?? null;

  // A state that never reported (e.g. Texas) is clickable but has nothing to
  // tabulate — its table slot shows a placeholder. States that reported in
  // some year keep the table even on a year they skipped.
  const hasHistory = detailValues
    ? Object.values(detailValues).some((v) => v != null)
    : false;

  // Sparkline renders the state's full reporting history so the line reads
  // as a mini timeline, not a fragment. The selected-year dot anchors the
  // user within that span.
  const trendSeries = useMemo(
    () =>
      years.map((y) => ({
        year: y,
        value: detailValues?.[y] ?? null,
      })),
    [detailValues],
  );

  // Rows for the comparison card: each selected state with its active-year
  // count. Only read when 2+ are selected, but recomputes with the year.
  const comparisonRows = useMemo(
    () =>
      selectedStates.map((name) => ({
        name,
        value: byState[name]?.[activeYear] ?? null,
      })),
    [selectedStates, activeYear],
  );

  // National-overview leaderboard: the top reporting states for the active
  // year. Only consumed when nothing is selected, but recomputes with the year.
  const topStates = useMemo(
    () => topStatesForYear(byState, activeYear, TOP_STATES_COUNT),
    [activeYear],
  );

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-6 lg:grid-cols-[360px_1fr]">
      <div>
        {count === 0 ? (
          <NationalOverviewCard
            nationalTotal={yearStats.total}
            year={activeYear}
            topStates={topStates}
          />
        ) : detailState ? (
          <StateDetailCard
            stateName={detailState}
            currentValue={currentValue}
            previousValue={previousValue}
            year={activeYear}
            rank={rank}
            reportingCount={yearStats.reportingCount}
            dcReporting={dcReporting}
            trendSeries={trendSeries}
            // Focused = drilled in from a comparison, so back returns to it
            // (cohort intact). Otherwise this is the lone selection, so back
            // clears to the national overview.
            backLabel={focusedState ? "Back to comparison" : "Back to national overview"}
            onBack={focusedState ? clearFocus : clearAll}
          />
        ) : (
          <EnrollmentComparisonCard
            rows={comparisonRows}
            year={activeYear}
            onFocus={focusState}
            onClear={clearAll}
          />
        )}
      </div>

      <div>
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
          {detailState ? `${detailState} Enrollment, by Year` : "Enrollment by Year"}
        </h2>
        <div className="mt-1">
          {detailState && hasHistory ? (
            <EnrollmentTable
              stateValues={detailValues}
              years={years}
              activeYear={activeYear}
            />
          ) : (
            // Same-height placeholder so the overview, comparison, and
            // no-history states don't collapse the column — keeps the panel a
            // constant height across modes.
            <div
              className="flex items-center justify-center px-3 text-center font-sans text-xs text-sable/40"
              style={{ height: ENROLLMENT_TABLE_HEIGHT }}
            >
              {count === 0
                ? "Select a state to see its year-by-year enrollment."
                : !detailState
                  ? "View one state's detail to see its year-by-year enrollment."
                  : "No year-by-year enrollment reported."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
