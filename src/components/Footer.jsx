/**
 * Page footer.
 *
 * Three link-style affordances (About this data, Download data, Compare
 * states) plus the last-updated meta line. "Compare states" stays a proper
 * button — it's the only ghosted *primary* action in the layout. The other
 * two are utility links.
 *
 * The About disclosure is a small controlled popover: a button toggles it,
 * outside-click and Escape close it. Native <details> doesn't close on
 * outside click, which felt broken. Could swap to shadcn Popover in Phase 2
 * for hover/keyboard niceties; the markup contract here is intentionally
 * compatible.
 */

import { useEffect, useRef, useState } from 'react';
import csvText from '../../homeschool-hub-state-summary-data.csv?raw';
import { DOWNLOAD_FILENAME, LAST_UPDATED } from '../config/theme.js';

/**
 * Trigger a client-side download of the bundled CSV. The CSV string is
 * wrapped in a Blob, exposed via a temporary object URL, and handed to a
 * synthetic anchor whose `download` attribute prompts a Save dialog. The URL
 * is revoked afterward so the browser can release the Blob from memory.
 */
function downloadCsv() {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = DOWNLOAD_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Footer() {
  return (
    <footer className="mt-3 border-t border-sable/10 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <AboutDisclosure />

          <button
            type="button"
            onClick={downloadCsv}
            className="font-sans text-xs text-sable/70 underline decoration-dashed decoration-sable/30 underline-offset-4 hover:text-sable hover:decoration-sable/60"
          >
            Download data (CSV)
          </button>

          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded border border-sable/15 px-3 py-1.5 font-sans text-xs text-sable/40"
          >
            + Compare states
          </button>
        </div>
        <p className="font-sans text-[10px] uppercase tracking-widest text-sable/40">
          Last updated {LAST_UPDATED} &middot; To be developed
        </p>
      </div>
    </footer>
  );
}

/**
 * Click-to-open popover anchored above the trigger. Closes on outside click
 * or Escape. Kept inline (not exported) because the About copy and its
 * placement are footer-specific.
 */
function AboutDisclosure() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`font-sans text-xs underline decoration-dashed underline-offset-4 ${
          open
            ? 'text-sable decoration-sable/60'
            : 'text-sable/70 decoration-sable/30 hover:text-sable hover:decoration-sable/60'
        }`}
      >
        About this data
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute bottom-full left-0 z-10 mb-2 w-80 rounded border border-sable/15 bg-white p-3 font-sans text-xs leading-relaxed text-sable/80 shadow-md"
        >
          The Homeschool Hub aggregates publicly reported state-level
          homeschool enrollment counts. Non-reporting states either decline to
          track homeschool enrollment or do not release it publicly, so
          national totals reflect reporting states only and should be read as
          a floor, not a complete count.
        </div>
      )}
    </div>
  );
}
