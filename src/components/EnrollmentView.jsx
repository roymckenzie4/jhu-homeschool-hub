/**
 * EnrollmentView — the homeschool-enrollment dashboard (the app's first view).
 *
 * Reads the cohort (`selectedStates`) and drill-in (`focusedState`) from the
 * shared selection context and owns only `activeYear` locally. The right-hand
 * panel is emergent from those: 0 selected -> national overview, 1 -> that
 * state's detail, 2+ -> comparison, 2+ with a focus -> the focused state's
 * detail with a "back to comparison" control. The map dispatches selection up
 * through `onSelect` (additive toggle); the year selector through `onChange`.
 *
 * Self-contained: renders its own header and footer so it can sit behind a tab
 * alongside the State policies view (see App.jsx). The page shell (max width,
 * padding, tab bar) lives in App.
 */

import { useMemo, useState } from "react";
import { useSelection } from "../state/selection.jsx";
import {
  enrollmentByState as byState,
  enrollmentYears as years,
  enrollmentCsvText,
} from "../data/enrollmentLoader.js";
import { deriveByYear, topStatesForYear } from "../data/derive.js";
import { ENROLLMENT_TABLE_HEIGHT } from "../config/layout.js";
import { MAP_MODE } from "../config/tileGrid.js";
import {
  RAMP_STEPS,
  schoolYearLabel,
  computeQuantileBreaks,
  rangeLabel,
  DOWNLOAD_FILENAME,
} from "../config/theme.js";
import Header from "./Header.jsx";
import YearSelector from "./YearSelector.jsx";
import Footer from "./Footer.jsx";
import ChoroplethMap from "./ChoroplethMap.jsx";
import MapLegend from "./MapLegend.jsx";
import StateDetailCard from "./StateDetailCard.jsx";
import NationalOverviewCard from "./NationalOverviewCard.jsx";
import EnrollmentComparisonCard from "./EnrollmentComparisonCard.jsx";
import EnrollmentTable from "./EnrollmentTable.jsx";
import { trackEvent } from "../lib/analytics.js";

// Enrollment data comes shaped from the loader (parsed once, shared with the
// State policies view's Homeschoolers column). byYear aggregates are derived here.
const byYear = deriveByYear(byState);

// Most recent five years stay pinned in the selector row; everything older
// is reachable through the trailing "More years" dropdown.
const RECENT_COUNT = 5;
const RECENT_YEARS = years.slice(-RECENT_COUNT);
const OLDER_YEARS = years.slice(0, -RECENT_COUNT);
const DEFAULT_YEAR = RECENT_YEARS[RECENT_YEARS.length - 1];

// Number of states in the national-overview leaderboard.
const TOP_STATES_COUNT = 5;

/**
 * Map a reporting value to one of the RAMP_STEPS buckets via quintile breaks.
 * Returns the non-reporting stripe pattern when no value exists. This is the
 * Enrollment view's `fillForState`, kept here (not in the map) so the map
 * stays classification-agnostic.
 */
function fillForValue(value, breaks) {
  if (value == null) return "url(#non-reporting)";
  if (!breaks) return RAMP_STEPS[0];
  for (let i = 0; i < RAMP_STEPS.length; i += 1) {
    if (value <= breaks[i + 1]) return RAMP_STEPS[i];
  }
  return RAMP_STEPS[RAMP_STEPS.length - 1];
}

export default function EnrollmentView() {
  // Selection lives in the shared context so it survives a topic switch.
  // Enrollment is additive: clicking toggles a state in/out of the cohort, and
  // the mode is emergent from how many are selected (0 overview / 1 single /
  // 2+ comparison) plus whether one is focused (a drill-in from a comparison).
  const { selectedStates, focusedState, toggleState, clearAll, focusState, clearFocus } =
    useSelection();
  const [activeYear, setActiveYear] = useState(DEFAULT_YEAR);
  const count = selectedStates.length;

  // The state whose single detail is shown: the drill-in target when comparing,
  // else the sole selection. Null in the overview (0) and comparison (2+ with
  // no drill-in) modes — those render their own cards instead.
  const detailState = focusedState ?? (count === 1 ? selectedStates[0] : null);

  function selectState(name) {
    toggleState(name);
    trackEvent("state_select", { view: "enrollment", state: name });
  }

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

  // { stateName: number | null } for the active year — what the map consumes.
  const valuesByState = useMemo(() => {
    const out = {};
    for (const name of Object.keys(byState)) {
      const v = byState[name][activeYear];
      out[name] = v == null ? null : v;
    }
    return out;
  }, [activeYear]);

  // Quintile break points for the choropleth classification. Computed once
  // per change in the active year's values; consumed by both the map (to
  // pick a bucket for each state) and the legend (to label each swatch).
  const breaks = useMemo(
    () => computeQuantileBreaks(Object.values(valuesByState)),
    [valuesByState],
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

  // Legend swatches: each quintile color paired with its value-range label.
  const swatches = useMemo(
    () =>
      RAMP_STEPS.map((color, i) => ({
        color,
        label: rangeLabel(breaks, i, RAMP_STEPS.length),
      })),
    [breaks],
  );

  return (
    <>
      <Header
        year={activeYear}
        nationalTotal={yearStats.total}
        reportingCount={yearStats.reportingCount}
        dcReporting={dcReporting}
      />

      {/* Section label + year selector */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
          Enrollment by State
        </h2>
        <YearSelector
          recentYears={RECENT_YEARS}
          olderYears={OLDER_YEARS}
          activeYear={activeYear}
          onChange={setActiveYear}
        />
      </div>
      <hr className="mt-3 border-t border-sable/15" />

      {/*
        Layout: two columns. Left column stacks the map + legend and the table;
        the right column holds the detail card and spans the full vertical
        height of the left column. At narrow widths the grid collapses to a
        single column in document order.
      */}
      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-[1fr_360px]">
        <div>
          <div
            className="mx-auto"
            style={{ maxWidth: "calc(320px * 760 / 460)" }}
          >
            <ChoroplethMap
              mode={MAP_MODE}
              fillForState={(name) =>
                fillForValue(valuesByState[name] ?? null, breaks)
              }
              selectedStates={selectedStates}
              onSelect={selectState}
              // Every state is selectable, including non-reporting ones — clicking
              // a grey state opens its detail card (its reporting history if it has
              // any, otherwise a "does not report" message). The map stays visually
              // honest: grey states keep the stripe pattern whether or not selected.
              ariaLabelForState={(name) => {
                const v = valuesByState[name] ?? null;
                return v != null
                  ? `${name}, ${v.toLocaleString()} reported homeschoolers`
                  : `${name}, no reported data for ${schoolYearLabel(activeYear)}`;
              }}
            />
          </div>
          <div className="mt-2">
            <MapLegend
              label={`Students, ${schoolYearLabel(activeYear)}`}
              swatches={swatches}
              trailing={
                <div className="flex items-center gap-2 whitespace-nowrap text-sable/60">
                  {/* Re-uses the SVG pattern defined in ChoroplethMap's <defs>. */}
                  <svg width="20" height="12" aria-hidden="true">
                    <rect width="20" height="12" fill="url(#non-reporting)" />
                  </svg>
                  <span>No public data</span>
                </div>
              }
            />
          </div>
        </div>

        <div className="lg:row-span-2">
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
          <hr className="border-t border-sable/15" />
          <h2 className="mt-3 font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
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
              // no-history states don't collapse the column — keeps the left
              // column and detail card a constant height across modes.
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

      <Footer
        csvText={enrollmentCsvText}
        downloadFilename={DOWNLOAD_FILENAME}
        about={
          <>
            The Homeschool Hub aggregates publicly reported state-level
            homeschool enrollment counts. Non-reporting states either decline to
            track homeschool enrollment or do not release it publicly, so
            national totals reflect reporting states only and should be read as a
            floor, not a complete count.
          </>
        }
      />
    </>
  );
}
