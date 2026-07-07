/**
 * Year-by-year enrollment table for the selected state.
 *
 * Renders every year the data covers (descending — most recent on top) inside
 * a fixed-height scroll area with a sticky header, so the full history is
 * reachable without growing the page. The active-year row is subtly
 * highlighted (tint + bold) and scrolled into view when the year changes, so
 * it stays tied to the detail card even when it's far down the list.
 *
 * The "% change" column is computed against the *actual* prior year's value
 * from the underlying byState shape — not the year above it in this table —
 * so a row whose prior year is missing from the view still gets a real YoY.
 *
 * Non-reporting years (state didn't release a figure that year) render as "—"
 * in both the enrollment and % change cells.
 */

import { useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table.jsx';
import { computeYoY } from '../data/derive.js';
import { formatNumber, formatYoY } from '../lib/format.js';
import { schoolYearLabel } from '../config/theme.js';
import { ENROLLMENT_TABLE_HEIGHT } from '../config/layout.js';

// Sticky header cells sit on a white base so scrolling rows pass underneath,
// with their own bottom border (the row border would scroll away with the row).
const HEAD_CELL =
  'sticky top-0 z-10 h-7 bg-white px-3 border-b border-sable/15 font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/60';

export default function EnrollmentTable({ stateValues, years, activeYear }) {
  // Most recent first.
  const displayYears = [...years].sort((a, b) => b - a);

  // Bring the highlighted row into view when the active year changes so it's
  // never stranded off-screen after picking an older year. `block: 'nearest'`
  // is a no-op when the row is already visible, so the common case (recent
  // year at the top) doesn't scroll.
  const activeRowRef = useRef(null);
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeYear]);

  return (
    <Table
      className="font-sans text-xs"
      containerStyle={{ height: ENROLLMENT_TABLE_HEIGHT }}
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={`${HEAD_CELL} text-left`}>Year</TableHead>
          <TableHead className={`${HEAD_CELL} text-right`}>Enrollment</TableHead>
          <TableHead className={`${HEAD_CELL} text-right`}>% Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayYears.map((year) => {
          const value = stateValues?.[year] ?? null;
          const prior = stateValues?.[year - 1] ?? null;
          const yoy = computeYoY(value, prior);
          const isActive = year === activeYear;
          const yoyPositive = yoy != null && yoy > 0;

          return (
            <TableRow
              key={year}
              ref={isActive ? activeRowRef : undefined}
              className={`border-b border-sable/10 transition-none ${
                isActive
                  ? 'bg-sable/[0.03] hover:bg-sable/[0.03]'
                  : 'hover:bg-transparent'
              }`}
            >
              <TableCell
                className={`px-3 py-1.5 text-sable ${
                  isActive ? 'font-semibold' : ''
                }`}
              >
                {schoolYearLabel(year)}
              </TableCell>
              <TableCell
                className={`px-3 py-1.5 text-right tabular-nums text-sable ${
                  isActive ? 'font-semibold' : ''
                }`}
              >
                {formatNumber(value)}
              </TableCell>
              <TableCell
                className={`px-3 py-1.5 text-right tabular-nums ${
                  yoy == null
                    ? 'text-sable/40'
                    : yoyPositive
                    ? 'text-gold'
                    : 'text-brick'
                } ${isActive ? 'font-semibold' : ''}`}
              >
                {formatYoY(yoy)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
