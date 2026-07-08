/**
 * EnrollmentPanel — the enrollment topic's card + data regions.
 *
 * The unified shell (App) owns the shared map, legend, chip row, and the year
 * selector. This panel supplies the two topic-specific regions the shell grid
 * places: a summary CARD (top-right, beside the map) and a full-width DATA zone
 * below (the by-year table on the left, the trend graph on the right, at a
 * matched height). It returns them as a fragment so both land directly in the
 * shell grid via CARD_SLOT_CLASS / DATA_SLOT_CLASS.
 *
 * Both regions are emergent from the shared selection: 0 selected -> national
 * overview, 1 -> that state's detail, 2+ -> comparison, 2+ with a focus -> the
 * focused state's detail with a "back to comparison" control. Selection itself
 * is dispatched by the shell's map; this panel only reads it and drives the
 * focus/back transitions.
 */

import { useMemo, useRef, useState } from "react";
import { useSelection } from "../state/selection.jsx";
import {
  enrollmentByState as byState,
  enrollmentYears as years,
} from "../data/enrollmentLoader.js";
import { deriveByYear, topStatesForYear } from "../data/derive.js";
import {
  ENROLLMENT_TABLE_HEIGHT,
  DATA_ZONE_MIN_HEIGHT,
  CARD_SLOT_CLASS,
  DATA_SLOT_CLASS,
} from "../config/layout.js";
import {
  comparisonColor,
  schoolYearLabel,
  enrollmentCitation,
} from "../config/theme.js";
import { exportElementAsPng } from "../lib/exportImage.js";
import { trackEvent } from "../lib/analytics.js";
import StateDetailCard from "./StateDetailCard.jsx";
import NationalOverviewCard from "./NationalOverviewCard.jsx";
import EnrollmentComparisonCard from "./EnrollmentComparisonCard.jsx";
import EnrollmentTable from "./EnrollmentTable.jsx";
import EnrollmentComparisonTable from "./EnrollmentComparisonTable.jsx";
import Sparkline from "./Sparkline.jsx";
import ComparisonTrend from "./ComparisonTrend.jsx";
import ComparisonLegend from "./ComparisonLegend.jsx";
import ChartExportCard from "./ChartExportCard.jsx";
import DownloadPngButton from "./DownloadPngButton.jsx";

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

  // Detail slices, keyed to the drill-in/single state (null in overview and
  // comparison modes, where these go unread).
  const detailValues = byState[detailState];
  const currentValue = detailValues?.[activeYear] ?? null;
  const previousValue = detailValues?.[activeYear - 1] ?? null;
  const rank = yearStats.rankByState[detailState] ?? null;

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

  // A state that never reported (e.g. Texas) is clickable but has nothing to
  // plot or tabulate — its table + graph slots show placeholders. The last
  // reported point feeds the card's "not reported this year" note for a state
  // that skipped only the active year.
  const reportingPoints = trendSeries.filter((d) => d.value != null);
  const hasHistory = reportingPoints.length > 0;
  const lastReported = hasHistory
    ? reportingPoints[reportingPoints.length - 1]
    : null;

  // Comparison mode: 2+ selected with no single-state drill-in. Drives the
  // multi-line trend + years×states table in the data zone.
  const isComparing = count >= 2 && !detailState;

  // Each selected state's line/column/legend color, by selection order. Shared
  // by the trend, the comparison table, and the chips (via App).
  const colorForState = (name) => comparisonColor(selectedStates.indexOf(name));

  // Trend highlight, lifted so the legend (in the heading row) and the chart
  // stay in lockstep: hover previews, click pins, hover takes precedence over a
  // pin. Guarded so a pin on a since-removed state highlights nothing.
  const [hoveredState, setHoveredState] = useState(null);
  const [pinnedState, setPinnedState] = useState(null);
  const rawHighlight = hoveredState ?? pinnedState;
  const highlighted = selectedStates.includes(rawHighlight) ? rawHighlight : null;
  const togglePin = (name) =>
    setPinnedState((prev) => (prev === name ? null : name));

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

  // Years×states series for the trend + comparison table: one row per year with
  // a value per selected state. Year-independent, so keyed only to the cohort.
  const comparisonSeries = useMemo(
    () =>
      years.map((y) => {
        const row = { year: y };
        selectedStates.forEach((name) => {
          row[name] = byState[name]?.[y] ?? null;
        });
        return row;
      }),
    [selectedStates],
  );

  // National-overview leaderboard: the top reporting states for the active
  // year. Only consumed when nothing is selected, but recomputes with the year.
  const topStates = useMemo(
    () => topStatesForYear(byState, activeYear, TOP_STATES_COUNT),
    [activeYear],
  );

  // Single-state detail drives both the table and the graph in the data zone.
  const showDetailData = detailState && hasHistory;

  // Chart export (PNG download). A composed ChartExportCard is mounted off-screen
  // holding whichever chart is currently shown; the download button snapshots it.
  // Only single-state and comparison modes have a chart to export.
  const exportable = showDetailData || isComparing;
  const chartExportRef = useRef(null);
  const spanLabel = `${schoolYearLabel(years[0])} to ${schoolYearLabel(years[years.length - 1])}`;

  // Title/subtitle/filename/legend for the off-screen export card, per mode. The
  // comparison export carries its own static color key so a republished graph
  // still identifies each line (the on-screen legend is an interactive sibling).
  let exportTitle;
  let exportSubtitle;
  let exportFilename;
  let exportLegend = null;
  if (isComparing) {
    exportTitle = "Homeschool enrollment trends";
    exportSubtitle = `Comparing ${count} states · ${spanLabel}`;
    exportFilename = "homeschool-enrollment-comparison.png";
    exportLegend = (
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {selectedStates.map((name) => (
          <span key={name} className="flex items-center gap-1.5 text-xs text-sable/80">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colorForState(name) }}
            />
            {name}
          </span>
        ))}
      </div>
    );
  } else if (showDetailData) {
    exportTitle = `${detailState} homeschool enrollment`;
    exportSubtitle = spanLabel;
    exportFilename = `homeschool-enrollment-${detailState.toLowerCase().replace(/\s+/g, "-")}.png`;
  }

  const handleDownloadChart = async () => {
    if (!chartExportRef.current) return;
    await exportElementAsPng(chartExportRef.current, exportFilename);
    trackEvent("download", { file: exportFilename });
  };

  return (
    <>
      {/* Summary card — beside the map. The map cell defines row 1's height; the
          card is pinned to fill it (lg:absolute over a relative cell) so a taller
          card can never grow the row, keeping the top section a constant height
          across every mode and both tabs. */}
      <div className={`${CARD_SLOT_CLASS} lg:relative`}>
       <div className="lg:absolute lg:inset-0">
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
            hasHistory={hasHistory}
            lastReported={lastReported}
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
            colorForState={colorForState}
            onFocus={focusState}
            onClear={clearAll}
          />
        )}
       </div>
      </div>

      {/* Data zone — full width below. Table left, trend graph right, both at
          ENROLLMENT_TABLE_HEIGHT so they read as one matched-height row. Each
          mode that has no single-state detail (overview, comparison, no-history
          states) shows same-height placeholders so the row never collapses. */}
      <div className={DATA_SLOT_CLASS} style={{ minHeight: DATA_ZONE_MIN_HEIGHT }}>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div>
            <h2 className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
              {detailState ? `${detailState}, by Year` : "Enrollment by Year"}
            </h2>
            <div className="mt-3">
              {showDetailData ? (
                <EnrollmentTable
                  stateValues={detailValues}
                  years={years}
                  activeYear={activeYear}
                />
              ) : isComparing ? (
                <EnrollmentComparisonTable
                  rows={comparisonSeries}
                  states={selectedStates}
                  activeYear={activeYear}
                  colorForState={colorForState}
                />
              ) : (
                <DataPlaceholder>
                  {count === 0
                    ? "Select a state to see its year-by-year enrollment."
                    : "No year-by-year enrollment reported."}
                </DataPlaceholder>
              )}
            </div>
          </div>

          <div>
            {/* Title, legend, and download spread across the row (justify-between)
                so the legend sits between the title and the button with breathing
                room on both sides, rather than glued to the button. */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="shrink-0 font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
                {isComparing ? "Trends" : "Year in Context"}
              </h2>
              {isComparing && (
                <ComparisonLegend
                  states={selectedStates}
                  colorForState={colorForState}
                  highlighted={highlighted}
                  onHover={setHoveredState}
                  onTogglePin={togglePin}
                />
              )}
              {exportable && <DownloadPngButton onClick={handleDownloadChart} />}
            </div>
            <div className="mt-3" style={{ height: ENROLLMENT_TABLE_HEIGHT }}>
              {showDetailData ? (
                <Sparkline series={trendSeries} selectedYear={activeYear} />
              ) : isComparing ? (
                <ComparisonTrend
                  rows={comparisonSeries}
                  states={selectedStates}
                  colorForState={colorForState}
                  highlighted={highlighted}
                />
              ) : (
                <DataPlaceholder>
                  Select a state to see its trend.
                </DataPlaceholder>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Off-screen export composition — the standalone card snapshotted to PNG
          on download. Kept out of the live layout (fixed, far left) so it never
          affects the on-screen look; recharts sizes fine inside its fixed box. */}
      {exportable && (
        <div
          aria-hidden="true"
          style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}
        >
          <div ref={chartExportRef}>
            <ChartExportCard
              title={exportTitle}
              subtitle={exportSubtitle}
              legend={exportLegend}
              citation={enrollmentCitation(spanLabel)}
            >
              {isComparing ? (
                <ComparisonTrend
                  rows={comparisonSeries}
                  states={selectedStates}
                  colorForState={colorForState}
                  highlighted={null}
                />
              ) : (
                <Sparkline series={trendSeries} selectedYear={activeYear} />
              )}
            </ChartExportCard>
          </div>
        </div>
      )}
    </>
  );
}

// Same-height filler for a data-zone slot with nothing to show, so the table +
// graph row stays a constant height across modes (no-resize discipline).
function DataPlaceholder({ children }) {
  return (
    <div
      className="flex items-center justify-center px-3 text-center font-sans text-xs text-sable/40"
      style={{ height: ENROLLMENT_TABLE_HEIGHT }}
    >
      {children}
    </div>
  );
}
