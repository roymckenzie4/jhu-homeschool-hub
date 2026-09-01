/**
 * Years×states enrollment table for the comparison mode (2+ states selected).
 *
 * Years as ROWS (most recent first), one COLUMN per selected state — the
 * transpose of the single-state EnrollmentTable, so several states' figures line
 * up for reading down a year or across a row. Carries the exact numbers the
 * multi-line ComparisonTrend beside it leaves out (the trend shows shape, this
 * shows magnitude).
 *
 * Column headers are the state postal codes, colored to match each state's trend
 * line, so the two share one color key. Same fixed-height scroll + sticky header
 * + active-year emphasis as EnrollmentTable. Non-reporting cells render "—".
 *
 * Inputs:
 *   rows:    Array<{ year, [stateName]: value|null }> — one row per year.
 *   states:  string[] — selected states, in selection order (column order).
 *   activeYear: number — the emphasized row.
 *   colorForState: (name) => string — header color per state.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table.jsx";
import { formatNumber } from "../lib/format.js";
import { schoolYearLabel } from "../config/theme.js";
import { BY_NAME } from "../config/states.js";
import { ENROLLMENT_TABLE_HEIGHT } from "../config/layout.js";
import { useScrollActiveRowIntoView } from "../lib/useScrollActiveRowIntoView.js";

const HEAD_CELL =
  "sticky top-0 z-10 h-7 bg-white px-3 border-b border-sable/15 font-sans text-[11px] font-semibold uppercase tracking-widest";

export default function EnrollmentComparisonTable({
  rows,
  states,
  activeYear,
  colorForState,
}) {
  // Most recent year first, matching EnrollmentTable.
  const displayRows = [...rows].sort((a, b) => b.year - a.year);

  // Keep the active-year row in view when the year changes — contained to the
  // table's own scroll, never the page (see useScrollActiveRowIntoView).
  const { activeRowRef, containerRef } = useScrollActiveRowIntoView(activeYear);

  return (
    <Table
      className="font-sans text-xs"
      containerStyle={{ height: ENROLLMENT_TABLE_HEIGHT }}
      containerLabel="Year-by-year enrollment comparison"
      containerRef={containerRef}
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={`${HEAD_CELL} text-left text-sable/70`}>
            Year
          </TableHead>
          {states.map((state) => (
            <TableHead key={state} className={`${HEAD_CELL} text-right text-sable`}>
              {/* A colored swatch (not colored text) carries the per-state color
                  key here — matching ComparisonLegend. Some COMPARISON_SERIES_COLORS
                  (the brand orange, spirit blue) fall well under 4.5:1 as text on
                  white; as a small swatch next to full-contrast text, the same
                  colors are fine (WCAG's text threshold doesn't apply to them). */}
              <span className="inline-flex items-center justify-end gap-1.5">
                <span
                  className="h-0.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorForState(state) }}
                  aria-hidden="true"
                />
                {BY_NAME[state]?.postal ?? state}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayRows.map((row) => {
          const isActive = row.year === activeYear;
          return (
            <TableRow
              key={row.year}
              ref={isActive ? activeRowRef : undefined}
              className={`border-b border-sable/10 transition-none ${
                isActive
                  ? "bg-sable/[0.03] hover:bg-sable/[0.03]"
                  : "hover:bg-transparent"
              }`}
            >
              <TableCell
                className={`px-3 py-1.5 text-sable ${
                  isActive ? "font-semibold" : ""
                }`}
              >
                {schoolYearLabel(row.year)}
              </TableCell>
              {states.map((state) => (
                <TableCell
                  key={state}
                  className={`px-3 py-1.5 text-right tabular-nums text-sable ${
                    isActive ? "font-semibold" : ""
                  }`}
                >
                  {row[state] != null ? (
                    formatNumber(row[state])
                  ) : (
                    <span className="text-sable/70">—</span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
