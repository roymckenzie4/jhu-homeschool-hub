/**
 * Right-side card shown on load, before any state is selected.
 *
 * Stands in for StateDetailCard when `selectedState` is null: instead of one
 * state's detail it summarizes the whole picture — the national reported total
 * as the headline (parallel to the single-state card's big number), a top-five
 * leaderboard for the active year, and a note on how to read the counts.
 *
 * Shares StateDetailCard's outer frame (border, left bar, lg:h-full) so it
 * drops into the same detail-panel slot at matching height. Inputs come
 * pre-shaped from EnrollmentPanel; no data lookup here beyond reading topStates.
 */

import { Table, TableBody, TableCell, TableRow } from "./ui/table.jsx";
import { formatNumber } from "../lib/format.js";
import { schoolYearLabel, TRANSITION_MS } from "../config/theme.js";
import { BY_NAME } from "../config/states.js";

export default function NationalOverviewCard({
  nationalTotal,
  year,
  topStates,
}) {
  return (
    <aside
      className="flex flex-col border border-l-4 border-sable/10 border-l-heritage bg-white px-6 py-4 lg:h-full"
      style={{ transitionDuration: `${TRANSITION_MS}ms` }}
    >
      <h3 className="font-sans text-lg font-semibold text-sable">
        United States
      </h3>

      <p className="mt-3 font-sans text-4xl font-bold leading-none text-sable">
        {formatNumber(nationalTotal)}
      </p>
      <p className="mt-2 font-sans text-xs leading-snug text-sable">
        reported homeschool students, {schoolYearLabel(year)}
      </p>

      <hr className="my-4 border-t border-sable/15" />

      {/* Leaderboard — a headerless, borderless table: quiet rank annotations
          pulled close to medium-weight names, bold right-aligned counts.
          Spacing (not row rules) separates the rows. */}
      <p className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
        Highest Reported Counts, {schoolYearLabel(year)}
      </p>
      <Table className="mt-6 font-sans text-xs">
        <TableBody>
          {topStates.map((s, i) => (
            <TableRow key={s.name} className="border-0 hover:bg-transparent">
              <TableCell className="w-5 py-1 pr-1.5 text-right tabular-nums text-[11px] text-sable/35">
                {i + 1}
              </TableCell>
              <TableCell className="py-1 pr-3 font-medium tracking-[0.03em] text-sable">
                {BY_NAME[s.name]?.name ?? s.name}
              </TableCell>
              <TableCell className="whitespace-nowrap py-1 text-right font-bold tabular-nums tracking-[0.03em] text-sable">
                {formatNumber(s.value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Caveat fills the remaining space and keeps the headline counts from
          being read as a true, complete total. */}
      <p className="mt-4 flex-1 font-sans text-xs leading-relaxed text-sable/60">
        States report homeschool enrollment in different ways, and many do not
        report it at all. These figures reflect only what each state publicly
        reports — a floor, not a complete count of homeschooling in any state or
        nationwide.
      </p>

      <div className="mt-auto">
        <hr className="mb-3 mt-3 border-t border-sable/15" />
        <p className="font-sans text-xs leading-relaxed text-sable/60">
          Select a state on the map to see its detail.
        </p>
      </div>
    </aside>
  );
}
