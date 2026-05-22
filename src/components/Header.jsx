/**
 * Page header: eyebrow line, the big headline with the national total,
 * and a subhead noting how many jurisdictions actually report.
 *
 * The headline number and reporting count come from the data layer
 * (Stage 2); everything else is static copy.
 */

import { schoolYearLabel } from "../config/theme.js";

function formatNumber(n) {
  return n == null ? "—" : n.toLocaleString("en-US");
}

export default function Header({
  year,
  nationalTotal,
  reportingCount,
  dcReporting,
}) {
  const stateCount = dcReporting ? reportingCount - 1 : reportingCount;
  const reportingPhrase = dcReporting
    ? `${stateCount} states and D.C.`
    : `${stateCount} states`;

  return (
    <header>
      <h1 className="font-sans text-3xl font-medium leading-[1.2] tracking-tight text-sable">
        In {schoolYearLabel(year)},{" "}
        <span className="font-bold">{formatNumber(nationalTotal)}</span> U.S.
        students were reported as homeschoolers.
      </h1>

      <p className="mt-2 max-w-4xl font-sans text-xs leading-relaxed text-sable/70">
        {reportingPhrase} publicly report homeschool enrollment. The count above
        reflects those states only; the true national total is higher and
        unknown.
      </p>
    </header>
  );
}
