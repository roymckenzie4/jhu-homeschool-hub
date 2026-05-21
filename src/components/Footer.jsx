/**
 * Page footer: ghosted action buttons (Compare states, Download data) that
 * aren't wired up in this prototype, plus the "About this data" paragraph
 * and the last-updated label.
 *
 * Buttons are real, disabled <button> elements so the structure is in place
 * for Phase 2 wiring without touching markup.
 */

import { LAST_UPDATED, schoolYearLabel } from '../config/theme.js';
import { JURISDICTIONS_LABEL } from '../config/states.js';

export default function Footer({ year, reportingCount }) {
  return (
    <footer className="mt-12 border-t border-sable/10 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded border border-sable/15 px-3 py-1.5 font-sans text-xs text-sable/40"
          >
            + Compare states
          </button>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded border border-sable/15 px-3 py-1.5 font-sans text-xs text-sable/40"
          >
            Download data (CSV)
          </button>
        </div>
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-sable/40">
          To be developed
        </p>
      </div>

      <p className="mt-6 max-w-4xl font-sans text-xs leading-relaxed text-sable/60">
        <span className="font-semibold text-sable/80">About this data.</span>{' '}
        The Homeschool Hub aggregates publicly reported state-level homeschool
        enrollment counts. In {schoolYearLabel(year)}, {reportingCount} of{' '}
        {JURISDICTIONS_LABEL} publicly released figures; the remaining
        states either decline to track homeschool enrollment or do not release
        it publicly. National totals shown reflect reporting states only and
        should be read as a floor, not a complete count. Last updated{' '}
        {LAST_UPDATED}.
      </p>
    </footer>
  );
}
