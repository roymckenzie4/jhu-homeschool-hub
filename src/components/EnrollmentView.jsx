/**
 * EnrollmentView — the homeschool-enrollment dashboard (the app's first view).
 *
 * Owns the two pieces of interactive state for this view: `selectedState` and
 * `activeYear`. The choropleth map dispatches state selection up through
 * `onSelect`; the year selector dispatches year changes up through `onChange`.
 * The detail card (with sparkline), enrollment table, and headline all read
 * from those two slices of the parsed data and recompute via memos.
 *
 * Self-contained: renders its own header and footer so it can sit behind a tab
 * alongside the State policies view (see App.jsx). The page shell (max width,
 * padding, tab bar) lives in App.
 */

import { useMemo, useState } from "react";
import {
  enrollmentByState as byState,
  enrollmentYears as years,
  enrollmentCsvText,
} from "../data/enrollmentLoader.js";
import { deriveByYear } from "../data/derive.js";
import { ENROLLMENT_TABLE_HEIGHT } from "../config/layout.js";
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

// Default selection per .md.
const DEFAULT_STATE = "Arkansas";

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
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);
  const [activeYear, setActiveYear] = useState(DEFAULT_YEAR);

  function selectState(name) {
    setSelectedState(name);
    trackEvent("state_select", { view: "enrollment", state: name });
  }

  const yearStats = byYear[activeYear];
  const dcReporting =
    (byState["District of Columbia"]?.[activeYear] ?? null) != null;
  const selectedStateValues = byState[selectedState];
  const currentValue = selectedStateValues?.[activeYear] ?? null;
  const previousValue = selectedStateValues?.[activeYear - 1] ?? null;
  const rank = yearStats.rankByState[selectedState] ?? null;

  // A state that never reported (e.g. Texas) is now clickable but has nothing
  // to tabulate — its table slot shows a placeholder. States that reported in
  // some year keep the table even on a year they skipped.
  const hasHistory = selectedStateValues
    ? Object.values(selectedStateValues).some((v) => v != null)
    : false;

  // Sparkline renders the state's full reporting history so the line reads
  // as a mini timeline, not a fragment. The selected-year dot anchors the
  // user within that span.
  const trendSeries = useMemo(
    () =>
      years.map((y) => ({
        year: y,
        value: selectedStateValues?.[y] ?? null,
      })),
    [selectedStateValues],
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

  // The shared map takes a list of selected states; this view selects exactly
  // one, so we wrap it in a stable single-element array.
  const selectedStateList = useMemo(() => [selectedState], [selectedState]);

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
              fillForState={(name) =>
                fillForValue(valuesByState[name] ?? null, breaks)
              }
              selectedStates={selectedStateList}
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
          <StateDetailCard
            stateName={selectedState}
            currentValue={currentValue}
            previousValue={previousValue}
            year={activeYear}
            rank={rank}
            reportingCount={yearStats.reportingCount}
            dcReporting={dcReporting}
            trendSeries={trendSeries}
          />
        </div>

        <div>
          <hr className="border-t border-sable/15" />
          <h2 className="mt-3 font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
            {selectedState} Enrollment, by Year
          </h2>
          <div className="mt-1">
            {hasHistory ? (
              <EnrollmentTable
                stateValues={selectedStateValues}
                years={years}
                activeYear={activeYear}
              />
            ) : (
              // Same-height placeholder so a no-history state doesn't collapse
              // the column (keeps the left column and detail card a constant
              // height across selections).
              <div
                className="flex items-center justify-center px-3 text-center font-sans text-xs text-sable/40"
                style={{ height: ENROLLMENT_TABLE_HEIGHT }}
              >
                No year-by-year enrollment reported.
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
