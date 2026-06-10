/**
 * App root.
 *
 * Owns the two pieces of interactive state in the prototype: `selectedState`
 * and `activeYear`. The choropleth map dispatches state selection up through
 * `onSelect`; the year selector dispatches year changes up through `onChange`.
 * The detail card (with sparkline), enrollment table, and headline all read
 * from those two slices of the parsed data and recompute via memos.
 */

import { useMemo, useState } from "react";
import csvText from "../homeschool-hub-state-summary-data.csv?raw";
import { parseCsv } from "./data/parseCsv.js";
import {
  deriveByYear,
  computeMaxDeviation,
  windowAroundYear,
} from "./data/derive.js";
import { schoolYearLabel, computeQuantileBreaks } from "./config/theme.js";
import Header from "./components/Header.jsx";
import YearSelector from "./components/YearSelector.jsx";
import Footer from "./components/Footer.jsx";
import ChoroplethMap from "./components/ChoroplethMap.jsx";
import MapLegend from "./components/MapLegend.jsx";
import StateDetailCard from "./components/StateDetailCard.jsx";
import EnrollmentTable from "./components/EnrollmentTable.jsx";

// Data is parsed once at module load — the CSV is bundled at build time.
const { byState, years } = parseCsv(csvText);
const byYear = deriveByYear(byState);

// Most recent five years stay pinned in the selector row; everything older
// is reachable through the trailing "More years" dropdown.
const RECENT_COUNT = 5;
const RECENT_YEARS = years.slice(-RECENT_COUNT);
const OLDER_YEARS = years.slice(0, -RECENT_COUNT);
const DEFAULT_YEAR = RECENT_YEARS[RECENT_YEARS.length - 1];

// Default selection per .md.
const DEFAULT_STATE = "Arkansas";

export default function App() {
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);
  const [activeYear, setActiveYear] = useState(DEFAULT_YEAR);

  const yearStats = byYear[activeYear];
  const dcReporting =
    (byState["District of Columbia"]?.[activeYear] ?? null) != null;
  const selectedStateValues = byState[selectedState];
  const currentValue = selectedStateValues?.[activeYear] ?? null;
  const previousValue = selectedStateValues?.[activeYear - 1] ?? null;
  const rank = yearStats.rankByState[selectedState] ?? null;

  // Centered five-year window around the selected year, clamped to the
  // start/end of the series. Drives both the enrollment table and the
  // sparkline so the two stay visually aligned.
  const tableYears = useMemo(
    () => windowAroundYear(years, activeYear, RECENT_COUNT),
    [activeYear],
  );

  // Trend series for the sparkline: oldest → newest across the window.
  const trendSeries = useMemo(
    () =>
      tableYears.map((y) => ({
        year: y,
        value: selectedStateValues?.[y] ?? null,
      })),
    [tableYears, selectedStateValues],
  );

  // Shared vertical scale across every state's sparkline within the window
  // — recomputed when the window shifts so cross-state comparison stays
  // honest year to year.
  const sparklineMaxDeviation = useMemo(
    () => computeMaxDeviation(byState, tableYears),
    [tableYears],
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

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-4 lg:px-12 lg:py-6">
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
              valuesByState={valuesByState}
              breaks={breaks}
              selectedState={selectedState}
              onSelect={setSelectedState}
            />
          </div>
          <div className="mt-2">
            <MapLegend
              label={`Students, ${schoolYearLabel(activeYear)}`}
              breaks={breaks}
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
            sparklineMaxDeviation={sparklineMaxDeviation}
          />
        </div>

        <div>
          <hr className="border-t border-sable/15" />
          <h2 className="mt-3 font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
            {selectedState} Enrollment, by Year
          </h2>
          <div className="mt-1">
            <EnrollmentTable
              stateValues={selectedStateValues}
              years={tableYears}
              activeYear={activeYear}
            />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
