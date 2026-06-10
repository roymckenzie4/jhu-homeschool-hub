/**
 * Year-by-year enrollment table for the selected state.
 *
 * Renders the five most recent school years (descending — most recent on
 * top), with the active year row subtly highlighted (tint + bold) so a
 * reader can tie it back to the detail card.
 *
 * The "% change" column is computed against the *actual* prior year's
 * value from the underlying byState shape — not the year above it in
 * this table. That means the bottom row (e.g. 2020-21) gets a real YoY
 * vs. 2019-20 rather than a "—", which is more informative for a 5-row
 * slice of a longer time series.
 *
 * Non-reporting years (state didn't release a figure that year) render
 * as "—" in both the enrollment and % change cells.
 */

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

export default function EnrollmentTable({ stateValues, years, activeYear }) {
  // Most recent first.
  const displayYears = [...years].sort((a, b) => b - a);

  return (
    <Table className="font-sans text-xs">
      <TableHeader>
        <TableRow className="border-b border-sable/15 hover:bg-transparent">
          <TableHead className="h-7 px-3 text-left font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/60">
            Year
          </TableHead>
          <TableHead className="h-7 px-3 text-right font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/60">
            Enrollment
          </TableHead>
          <TableHead className="h-7 px-3 text-right font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/60">
            % Change
          </TableHead>
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
