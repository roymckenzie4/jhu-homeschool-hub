/**
 * App root.
 *
 * Owns the single piece of interactive state in the prototype: `selectedState`.
 * The choropleth map dispatches selection up through `onSelect`; the detail
 * card and enrollment table both read from the same selected-state slice
 * of the parsed data. The sparkline slot inside the detail card is the
 * only remaining placeholder — landing in Stage 5b with shadcn-charts.
 */

import { useMemo, useState } from 'react';
import csvText from '../homeschool-hub-state-summary-data.csv?raw';
import { parseCsv } from './data/parseCsv.js';
import { deriveByYear } from './data/derive.js';
import { schoolYearLabel, computeQuantileBreaks } from './config/theme.js';
import Header from './components/Header.jsx';
import YearSelector from './components/YearSelector.jsx';
import Footer from './components/Footer.jsx';
import ChoroplethMap from './components/ChoroplethMap.jsx';
import MapLegend from './components/MapLegend.jsx';
import StateDetailCard from './components/StateDetailCard.jsx';
import EnrollmentTable from './components/EnrollmentTable.jsx';

// Data is parsed once at module load — the CSV is bundled at build time.
const { byState, years } = parseCsv(csvText);
const byYear = deriveByYear(byState);

// Years displayed in the selector: most recent five reporting years.
const SELECTOR_YEARS = years.slice(-5);
const ACTIVE_YEAR = SELECTOR_YEARS[SELECTOR_YEARS.length - 1];

// Default selection per CLAUDE.md.
const DEFAULT_STATE = 'Arkansas';

// Most recent five years displayed in the enrollment table (descending).
const TABLE_YEARS = years.slice(-5);

export default function App() {
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);
  const yearStats = byYear[ACTIVE_YEAR];
  const selectedStateValues = byState[selectedState];
  const currentValue = selectedStateValues?.[ACTIVE_YEAR] ?? null;
  const previousValue = selectedStateValues?.[ACTIVE_YEAR - 1] ?? null;
  const rank = yearStats.rankByState[selectedState] ?? null;

  // { stateName: number | null } for the active year — what the map consumes.
  const valuesByState = useMemo(() => {
    const out = {};
    for (const name of Object.keys(byState)) {
      const v = byState[name][ACTIVE_YEAR];
      out[name] = v == null ? null : v;
    }
    return out;
  }, []);

  // Quintile break points for the choropleth classification. Computed once
  // per change in the active year's values; consumed by both the map (to
  // pick a bucket for each state) and the legend (to label each swatch).
  const breaks = useMemo(
    () => computeQuantileBreaks(Object.values(valuesByState)),
    [valuesByState],
  );

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-12 lg:px-12 lg:py-16">
      <Header
        year={ACTIVE_YEAR}
        nationalTotal={yearStats.total}
        reportingCount={yearStats.reportingCount}
      />

      {/* Section label + year selector */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-sable/70">
          Enrollment by State
        </h2>
        <YearSelector years={SELECTOR_YEARS} activeYear={ACTIVE_YEAR} />
      </div>

      {/*
        Layout: two columns. Left column stacks the map + legend and the table;
        the right column holds the detail card and spans the full vertical
        height of the left column. At narrow widths the grid collapses to a
        single column in document order.
      */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <ChoroplethMap
            valuesByState={valuesByState}
            breaks={breaks}
            selectedState={selectedState}
            onSelect={setSelectedState}
          />
          <div className="mt-4">
            <MapLegend
              label={`Students, ${schoolYearLabel(ACTIVE_YEAR)}`}
              breaks={breaks}
            />
          </div>
        </div>

        <div className="lg:row-span-2">
          <StateDetailCard
            stateName={selectedState}
            currentValue={currentValue}
            previousValue={previousValue}
            year={ACTIVE_YEAR}
            rank={rank}
            reportingCount={yearStats.reportingCount}
          />
        </div>

        <div>
          <hr className="border-t border-sable/15" />
          <h2 className="mt-6 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-sable/70">
            {selectedState} Enrollment, by Year
          </h2>
          <div className="mt-3">
            <EnrollmentTable
              stateValues={selectedStateValues}
              years={TABLE_YEARS}
              activeYear={ACTIVE_YEAR}
            />
          </div>
        </div>
      </div>

      <Footer year={ACTIVE_YEAR} reportingCount={yearStats.reportingCount} />
    </main>
  );
}
