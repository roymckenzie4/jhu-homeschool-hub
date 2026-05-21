/**
 * App root.
 *
 * Stage 3: static layout shells. The page composition matches the mockup —
 * header, year selector, map + detail card grid, table, footer — with
 * placeholder boxes where Stage 4+ components (map, detail card, table)
 * will be rendered. Real numbers from the data layer flow into the header
 * and footer; selection state isn't wired yet.
 */

import csvText from '../homeschool-hub-state-summary-data.csv?raw';
import { parseCsv } from './data/parseCsv.js';
import { deriveByYear } from './data/derive.js';
import Header from './components/Header.jsx';
import YearSelector from './components/YearSelector.jsx';
import Footer from './components/Footer.jsx';

// Data is parsed once at module load — the CSV is bundled at build time.
const { byState, years } = parseCsv(csvText);
const byYear = deriveByYear(byState);

// Years displayed in the selector: most recent five reporting years.
const SELECTOR_YEARS = years.slice(-5);
const ACTIVE_YEAR = SELECTOR_YEARS[SELECTOR_YEARS.length - 1];

export default function App() {
  const yearStats = byYear[ACTIVE_YEAR];

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
        Layout: two columns. Left column stacks the map and the table; the
        right column holds the detail card and spans the full vertical
        height of the left column (map + table). At narrow widths the grid
        collapses to a single column in document order.
      */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Placeholder label="Choropleth map" heightClass="h-[460px]" />
        <Placeholder
          label="State detail card"
          accent
          className="lg:row-span-2 lg:h-auto"
        />
        <div>
          <hr className="border-t border-sable/15" />
          <h2 className="mt-6 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-sable/70">
            Arkansas Enrollment, by Year
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
 * Dashed placeholder box used during Stage 3 to lock layout before the real
 * components ship in Stages 4-5. The `accent` variant wraps the dashed box
 * in a solid heritage-blue left bar — that bar is the final detail-card
 * affordance and stays once the real component lands.
 */
function Placeholder({ label, heightClass = '', accent = false, className = '' }) {
  // Accent (detail card) stretches to its grid cell; plain placeholders use
  // the explicit heightClass so they don't blow past their content.
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
