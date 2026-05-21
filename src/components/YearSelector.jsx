/**
 * Year selector — a segmented control of connected buttons. Visual-only for
 * this prototype: the active year (2024-25) is filled with Heritage Blue;
 * the others render as ghosted/disabled segments to communicate the feature
 * exists but isn't wired up yet.
 *
 * Borders overlap via `-ml-px` so adjacent segments share a single border
 * line, matching the mockup's connected look.
 */

import { schoolYearLabel } from '../config/theme.js';
import { cn } from '../lib/utils.js';

export default function YearSelector({ years, activeYear }) {
  return (
    <div className="flex items-center">
      <span className="mr-3 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-sable/60">
        Year
      </span>
      <div className="flex">
        {years.map((year, i) => {
          const active = year === activeYear;
          const first = i === 0;
          const last = i === years.length - 1;
          return (
            <button
              key={year}
              type="button"
              disabled={!active}
              aria-pressed={active}
              className={cn(
                'border border-sable/20 px-3 py-1.5 font-sans text-sm tabular-nums transition',
                !first && '-ml-px',
                first && 'rounded-l',
                last && 'rounded-r',
                active
                  ? 'z-10 border-heritage bg-heritage text-white'
                  : 'cursor-not-allowed bg-white text-sable/40',
              )}
            >
              {schoolYearLabel(year)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
