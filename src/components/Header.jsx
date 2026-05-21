/**
 * Page header: eyebrow line, the big headline with the national total,
 * and a subhead noting how many jurisdictions actually report.
 *
 * The headline number and reporting count come from the data layer
 * (Stage 2); everything else is static copy.
 */

import { schoolYearLabel } from '../config/theme.js';
import { JURISDICTIONS_LABEL } from '../config/states.js';

function formatNumber(n) {
  return n == null ? '—' : n.toLocaleString('en-US');
}

export default function Header({ year, nationalTotal, reportingCount }) {
  return (
    <header>
      <p className="font-slab text-[11px] font-medium uppercase tracking-[0.22em] text-sable">
        Johns Hopkins University &middot; Homeschool Hub
      </p>

      <h1 className="mt-6 max-w-4xl font-sans text-4xl font-medium leading-[1.15] text-sable">
        In {schoolYearLabel(year)}, at least{' '}
        <span className="font-bold">{formatNumber(nationalTotal)}</span>{' '}
        students were reported as homeschoolers in the United States.
      </h1>

      <p className="mt-5 max-w-3xl font-sans text-sm leading-relaxed text-sable/70">
        {reportingCount} of {JURISDICTIONS_LABEL} publicly report homeschool
        enrollment. The figure above reflects those states only;
        the true national total is higher and unknown.
      </p>
    </header>
  );
}
