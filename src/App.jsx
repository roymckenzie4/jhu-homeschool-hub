/**
 * App root.
 *
 * Stage 2: data layer verification. Parses the published CSV at module load
 * (via Vite's `?raw` import) and renders a temporary debug panel showing the
 * 2024-25 national total, reporting count, and Arkansas's value + national
 * rank. The panel is intentionally minimal — it goes away in Stage 3 when
 * real components consume these values.
 */

import csvText from '../homeschool-hub-state-summary-data.csv?raw';
import { parseCsv } from './data/parseCsv.js';
import { deriveByYear } from './data/derive.js';
import { schoolYearLabel } from './config/theme.js';

const { byState, years } = parseCsv(csvText);
const byYear = deriveByYear(byState);

const DEBUG_YEAR = 2024;
const DEBUG_STATE = 'Arkansas';

function formatNumber(n) {
  return n == null ? '—' : n.toLocaleString('en-US');
}

export default function App() {
  const yearStats = byYear[DEBUG_YEAR];
  const arkansasValue = byState[DEBUG_STATE]?.[DEBUG_YEAR];
  const arkansasRank = yearStats?.rankByState[DEBUG_STATE];

  return (
    <main className="mx-auto max-w-5xl px-8 py-12">
      <p className="font-slab text-xs uppercase tracking-[0.18em] text-sable">
        Johns Hopkins University · Homeschool Hub
      </p>

      <h1 className="mt-6 font-sans text-2xl font-semibold text-sable">
        Stage 2 — data layer debug
      </h1>

      <dl className="mt-8 grid grid-cols-1 gap-y-4 font-sans text-sable sm:grid-cols-[16rem_1fr]">
        <dt className="text-sm text-sable/60">School year</dt>
        <dd className="text-sm">{schoolYearLabel(DEBUG_YEAR)}</dd>

        <dt className="text-sm text-sable/60">National total (reporting states)</dt>
        <dd className="text-base font-medium tabular-nums">
          {formatNumber(yearStats?.total)}
        </dd>

        <dt className="text-sm text-sable/60">Reporting jurisdictions (incl. DC)</dt>
        <dd className="text-base font-medium tabular-nums">
          {yearStats?.reportingCount} of 51
        </dd>

        <dt className="text-sm text-sable/60">Arkansas reported value</dt>
        <dd className="text-base font-medium tabular-nums">
          {formatNumber(arkansasValue)}
        </dd>

        <dt className="text-sm text-sable/60">Arkansas national rank</dt>
        <dd className="text-base font-medium tabular-nums">
          #{arkansasRank} of {Object.keys(yearStats?.rankByState ?? {}).length}
        </dd>

        <dt className="text-sm text-sable/60">Years parsed</dt>
        <dd className="text-sm tabular-nums">
          {years[0]}–{years[years.length - 1]} ({years.length} years)
        </dd>
      </dl>

      <section className="mt-12">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-sable/70">
          Arkansas — last 5 reporting years
        </h2>
        <table className="mt-3 font-sans text-sm text-sable tabular-nums">
          <tbody>
            {years.slice(-5).map((y) => (
              <tr key={y}>
                <td className="pr-6 text-sable/60">{schoolYearLabel(y)}</td>
                <td>{formatNumber(byState[DEBUG_STATE]?.[y])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
