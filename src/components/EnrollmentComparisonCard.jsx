/**
 * Right-side card shown when 2+ states are selected on Enrollment (the emergent
 * comparison mode). Lists the cohort with each state's active-year count and a
 * "View detail" drill-in per row.
 *
 * Drilling in sets the shared focusedState (a lens over the cohort, not a
 * membership change), which swaps this card for that state's StateDetailCard
 * with a "Back to comparison" control. The color dot on each row is the state's
 * comparison color, shared with the multi-line trend + years×states table that
 * fill the data zone below.
 *
 * Shares StateDetailCard / NationalOverviewCard's outer frame so it drops into
 * the same panel slot at matching height. Rows come pre-shaped from
 * EnrollmentPanel; no data lookup here.
 */

import { Table, TableBody, TableCell, TableRow } from "./ui/table.jsx";
import { formatNumber } from "../lib/format.js";
import { schoolYearLabel } from "../config/theme.js";
import { BY_NAME } from "../config/states.js";
import SummaryCard, {
  CARD_HEADING_CLASS,
  CARD_DIVIDER_CLASS,
  CARD_CAVEAT_CLASS,
} from "./SummaryCard.jsx";

export default function EnrollmentComparisonCard({
  rows,
  year,
  colorForState,
  onFocus,
  onClear,
}) {
  return (
    <SummaryCard>
      <div className="flex items-baseline justify-between">
        <h3 className={CARD_HEADING_CLASS}>
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

      <hr className={CARD_DIVIDER_CLASS} />

      {/* One row per selected state: name, active-year count, drill-in link.
          Spacing (not row rules) separates rows, matching the overview card. */}
      <Table className="font-sans text-xs">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name} className="border-0 hover:bg-transparent">
              <TableCell className="py-1.5 pr-3 font-medium tracking-[0.03em] text-sable">
                <span className="inline-flex items-center gap-2">
                  {/* Color key shared with the trend lines + table columns. */}
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colorForState(row.name) }}
                    aria-hidden="true"
                  />
                  {BY_NAME[row.name]?.name ?? row.name}
                </span>
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

      <p className={CARD_CAVEAT_CLASS}>
        Compare the trend lines and year-by-year figures below, or view one
        state's full detail.
      </p>
    </SummaryCard>
  );
}
