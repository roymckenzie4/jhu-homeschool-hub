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
import { schoolYearLabel } from "../config/theme.js";
import { BY_NAME } from "../config/states.js";
import SummaryCard, {
  CARD_HEADING_CLASS,
  CARD_DIVIDER_CLASS,
  CARD_EYEBROW_CLASS,
  CARD_CAVEAT_CLASS,
} from "./SummaryCard.jsx";

export default function NationalOverviewCard({
  nationalTotal,
  year,
  topStates,
}) {
  return (
    <SummaryCard>
      <h3 className={CARD_HEADING_CLASS}>United States</h3>

      <p className="mt-3 font-sans text-4xl font-bold leading-none text-sable">
        {formatNumber(nationalTotal)}
      </p>
      <p className="mt-2 font-sans text-xs leading-snug text-sable">
        reported homeschool students, {schoolYearLabel(year)}
      </p>

      <hr className={CARD_DIVIDER_CLASS} />

      {/* Leaderboard — a headerless, borderless table: quiet rank annotations
          pulled close to medium-weight names, bold right-aligned counts.
          Spacing (not row rules) separates the rows. */}
      <p className={CARD_EYEBROW_CLASS}>
        Highest Reported Counts, {schoolYearLabel(year)}
      </p>
      <Table className="mt-2 font-sans text-xs">
        <TableBody>
          {topStates.map((s, i) => (
            <TableRow key={s.name} className="border-0 hover:bg-transparent">
              <TableCell className="w-5 py-1.5 pr-1.5 text-right tabular-nums text-[11px] text-sable/35">
                {i + 1}
              </TableCell>
              <TableCell className="py-1.5 pr-3 font-medium tracking-[0.03em] text-sable">
                {BY_NAME[s.name]?.name ?? s.name}
              </TableCell>
              <TableCell className="whitespace-nowrap py-1.5 text-right font-bold tabular-nums tracking-[0.03em] text-sable">
                {formatNumber(s.value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Caveat fills the remaining space and keeps the headline counts from
          being read as a true, complete total. */}
      <p className={CARD_CAVEAT_CLASS}>
        States report homeschool enrollment differently and many not at all;
        these counts are a floor, not a complete nationwide total.
      </p>
    </SummaryCard>
  );
}
