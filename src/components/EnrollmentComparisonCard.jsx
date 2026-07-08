/**
 * Right-side card shown when 2+ states are selected on Enrollment (the emergent
 * comparison mode). Lists the cohort with each state's active-year count and a
 * "View detail" drill-in per row.
 *
 * Drilling in sets the shared focusedState (a lens over the cohort, not a
 * membership change), which swaps this card for that state's StateDetailCard
 * with a "Back to comparison" control. Placeholder for now — the multi-line
 * trend comparison (Tier B) upgrades this same slot later.
 *
 * Shares StateDetailCard / NationalOverviewCard's outer frame so it drops into
 * the same panel slot at matching height. Rows come pre-shaped from
 * EnrollmentPanel; no data lookup here.
 */

import { Table, TableBody, TableCell, TableRow } from "./ui/table.jsx";
import { formatNumber } from "../lib/format.js";
import { schoolYearLabel, TRANSITION_MS } from "../config/theme.js";
import { BY_NAME } from "../config/states.js";

export default function EnrollmentComparisonCard({
  rows,
  year,
  onFocus,
  onClear,
}) {
  return (
    <aside
      className="flex flex-col border border-l-4 border-sable/10 border-l-heritage bg-white px-6 py-4 lg:h-full"
      style={{ transitionDuration: `${TRANSITION_MS}ms` }}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-sans text-lg font-semibold text-sable">
          Comparing {rows.length} states
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="font-sans text-xs text-sable/60 underline-offset-4 hover:text-heritage hover:underline"
        >
          Clear
        </button>
      </div>
      <p className="mt-2 font-sans text-xs leading-snug text-sable/60">
        reported homeschool students, {schoolYearLabel(year)}
      </p>

      <hr className="my-4 border-t border-sable/15" />

      {/* One row per selected state: name, active-year count, drill-in link.
          Spacing (not row rules) separates rows, matching the overview card. */}
      <Table className="font-sans text-xs">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name} className="border-0 hover:bg-transparent">
              <TableCell className="py-1.5 pr-3 font-medium tracking-[0.03em] text-sable">
                {BY_NAME[row.name]?.name ?? row.name}
              </TableCell>
              <TableCell className="whitespace-nowrap py-1.5 pr-3 text-right tabular-nums tracking-[0.03em] text-sable">
                {row.value != null ? (
                  <span className="font-bold">{formatNumber(row.value)}</span>
                ) : (
                  <span className="text-sable/45">not reported</span>
                )}
              </TableCell>
              <TableCell className="w-0 whitespace-nowrap py-1.5 text-right">
                <button
                  type="button"
                  onClick={() => onFocus(row.name)}
                  className="font-sans text-xs font-medium text-heritage underline-offset-4 hover:underline"
                >
                  View detail →
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="mt-4 flex-1 font-sans text-xs leading-relaxed text-sable/60">
        Select more states on the map to add them, or view one state's full
        detail. A side-by-side trend comparison lands here next.
      </p>
    </aside>
  );
}
