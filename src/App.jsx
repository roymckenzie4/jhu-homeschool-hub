/**
 * App root.
 *
 * Owns the single piece of interactive state in the prototype: `selectedState`.
 * The choropleth map dispatches selection up through `onSelect`; the detail
 * card and table (Stage 5) will read the same state. Stage 4 only wires the
 * map — the detail card and table remain placeholders.
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

// Data is parsed once at module load — the CSV is bundled at build time.
const { byState, years } = parseCsv(csvText);
const byYear = deriveByYear(byState);

// Years displayed in the selector: most recent five reporting years.
const SELECTOR_YEARS = years.slice(-5);
const ACTIVE_YEAR = SELECTOR_YEARS[SELECTOR_YEARS.length - 1];

// Default selection per CLAUDE.md.
const DEFAULT_STATE = 'Arkansas';

export default function App() {
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);
  const yearStats = byYear[ACTIVE_YEAR];

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

        <Placeholder
          label="State detail card"
          accent
          className="lg:row-span-2 lg:h-auto"
        />

        <div>
          <hr className="border-t border-sable/15" />
          <h2 className="mt-6 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-sable/70">
            {selectedState} Enrollment, by Year
          </h2>
          <Placeholder
            label="Enrollment table"
            heightClass="h-[220px]"
            className="mt-3"
          />
        </div>
      </div>

      <Footer year={ACTIVE_YEAR} reportingCount={yearStats.reportingCount} />
    </main>
  );
}

/**
 * Dashed placeholder box for Stage 5 components (detail card, table). Same
 * shape as Stage 3 — kept here until those land.
 */
function Placeholder({ label, heightClass = '', accent = false, className = '' }) {
  return (
    <div
      className={`${accent ? 'border-l-4 border-heritage' : ''} ${className}`}
    >
      <div
        className={`flex items-center justify-center rounded border border-dashed border-sable/20 bg-sable/[0.02] ${
          accent ? 'h-full min-h-[460px]' : heightClass
        }`}
      >
        <span className="font-sans text-xs uppercase tracking-[0.18em] text-sable/40">
          {label}
        </span>
      </div>
    </div>
  );
}
