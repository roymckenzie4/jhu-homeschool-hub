/**
 * PolicyComparisonTable — the side-by-side regulation comparison.
 *
 * A plain table (same shape as the Enrollment table): states are rows, the 10
 * tracked regulations are columns grouped into Registration / Instruction /
 * Assessment bands, followed by a Homeschoolers (latest-year enrollment)
 * column. It sizes naturally to its rows — the fixed frame lives at the shell
 * level (see App), not here. Each regulation cell shows "Yes" (in force, in
 * heritage) or a muted "No"; either links to that rule's source statute when
 * the sheet provides one. The STATE cell anchors the name, with the Low/Med/High
 * badge and regulation count as right-aligned metadata; removal is via the chips.
 *
 * Column widths are pinned so a long state name or "not reported" can never
 * reflow the grid. When nothing is selected, a prompt stands in for the table.
 * The "About this data" copy lives in the shared footer (see topics/policyTopic).
 *
 * Source links come from the Google Sheet snapshot via the loader. Cells the
 * sheet has no link for (source is the placeholder) render as plain text rather
 * than linking to the raw spreadsheet.
 *
 * Props:
 *   - selectedStates string[]   states to show as rows, in selection order.
 *   - policyByState   object     shaped regulation data.
 */

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/table.jsx";
import {
  REGULATION_GROUPS,
  REGULATION_COUNT,
  LEVELS,
  PLACEHOLDER_SOURCE_URL,
} from "../config/policy.js";
import { COLORS, levelColor, schoolYearLabel } from "../config/theme.js";
import { formatNumber } from "../lib/format.js";
import {
  enrollmentLatestYear,
  enrollmentInLatestYear,
} from "../data/enrollmentLoader.js";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./ui/tooltip.jsx";

// Flattened column model: each regulation with its group + a flag for the
// first column of each group (which gets the left divider that separates bands).
const COLUMNS = REGULATION_GROUPS.flatMap((group) =>
  group.regulations.map((reg, i) => ({
    ...reg,
    groupId: group.id,
    isGroupStart: i === 0,
  })),
);

// Subtle left divider between regulation bands (and before Homeschoolers).
const DIVIDER = "border-l border-sable/10";

// Pinned column widths so the grid never shifts with content — a long state
// name ("District of Columbia") or "not reported" can't reflow the table.
const STATE_COL = "w-[272px]";
const HS_COL = "w-[104px]";

// Neutral shade behind the State + Homeschoolers header cells, so the whole
// header band reads as one shaded strip alongside the tinted group cells.
const HEADER_TINT = "bg-sable/[0.03]";

// Brand-derived band tints behind each group's header, so the three regulation
// categories read as distinct column groups.
const GROUP_TINT = {
  registration: "bg-heritage/[0.06]",
  instruction: "bg-gold/[0.09]",
  assessment: "bg-sable/[0.05]",
};

/** Low/Med/High pill. White text on the dark High red; sable otherwise. */
function LevelBadge({ level }) {
  if (!level) return null;
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: levelColor(level),
        color: level === "High" ? "#FFFFFF" : COLORS.sable,
      }}
    >
      {LEVELS[level].label}
    </span>
  );
}

// Shown in place of the table when no states are selected yet. Fills the data
// zone's reserved height (flex-1 in the panel's flex column) so it reads as a
// deliberate empty state rather than a short box floating above whitespace.
function EmptyPrompt() {
  return (
    <div className="flex flex-1 items-center justify-center rounded border border-dashed border-sable/25 px-6 py-10 text-center font-sans text-sm text-sable/50">
      <p>
        Select states on the map — or use{" "}
        <span className="font-medium text-sable/70">+ add state</span> — to
        compare their regulations side by side.
      </p>
    </div>
  );
}

export default function PolicyComparisonTable({
  selectedStates,
  policyByState,
}) {
  if (selectedStates.length === 0) return <EmptyPrompt />;

  return (
    <TooltipProvider delayDuration={150}>
      <Table className="text-xs" containerClassName="border-b border-sable/15">
        <TableHeader>
          {/* Band row: STATE + the three regulation groups + Homeschoolers. */}
          <TableRow className="border-b border-sable/15 hover:bg-transparent">
            <TableHead
              rowSpan={2}
              className={`h-auto ${STATE_COL} py-1.5 pl-3 pr-2 align-bottom text-[11px] font-semibold uppercase tracking-widest text-sable/70 ${HEADER_TINT}`}
            >
              State
            </TableHead>
            {REGULATION_GROUPS.map((group) => (
              <TableHead
                key={group.id}
                colSpan={group.regulations.length}
                className={`h-auto px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-widest text-sable/70 ${DIVIDER} ${GROUP_TINT[group.id]}`}
              >
                {group.label}
              </TableHead>
            ))}
            <TableHead
              rowSpan={2}
              className={`h-auto ${HS_COL} px-2 py-1.5 text-right align-bottom text-[11px] font-semibold uppercase tracking-widest text-sable/70 ${DIVIDER} ${HEADER_TINT}`}
            >
              Homeschoolers
              <span className="block text-[9px] font-normal tracking-normal text-sable/45">
                {schoolYearLabel(enrollmentLatestYear)}
              </span>
            </TableHead>
          </TableRow>
          {/* Regulation row: one column per tracked regulation. Each label
              carries a definition tooltip (hover or keyboard focus). */}
          <TableRow className="border-b border-sable/15 hover:bg-transparent">
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={`h-auto w-[64px] px-1 py-1.5 text-center align-bottom text-[10px] font-medium leading-tight text-sable/60 ${
                  col.isGroupStart ? DIVIDER : ""
                }`}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      className="cursor-help underline decoration-dotted decoration-sable/40 underline-offset-2 outline-none focus-visible:ring-1 focus-visible:ring-heritage"
                    >
                      {col.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{col.definition}</TooltipContent>
                </Tooltip>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {selectedStates.map((name) => {
            const entry = policyByState[name];
            const enrollment = enrollmentInLatestYear(name);
            return (
              <TableRow
                key={name}
                className="border-b border-sable/10 hover:bg-sable/[0.04]"
              >
                <TableCell className={`${STATE_COL} py-1.5 pl-3 pr-2`}>
                  {/* Name flush-left fills the row (flex-1), pushing the badge +
                      score metadata flush to the right edge as one tight unit
                      (score close to the badge). */}
                  <span className="flex items-center whitespace-nowrap">
                    <span className="flex-1 font-sans font-semibold text-sable">
                      {name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <LevelBadge level={entry?.level} />
                      {entry && (
                        <span className="font-sans text-[10px] tabular-nums tracking-normal text-sable/40">
                          {entry.total}/{REGULATION_COUNT}
                        </span>
                      )}
                    </span>
                  </span>
                </TableCell>

                {COLUMNS.map((col) => {
                  const cell = entry?.regulations[col.key];
                  const inForce = cell?.value;
                  const hasSource =
                    cell?.source && cell.source !== PLACEHOLDER_SOURCE_URL;
                  const label = inForce ? "Yes" : "No";
                  // In force reads in heritage (medium, not bold — the dotted
                  // underline carries the "source link" signal instead of weight);
                  // not-in-force stays muted, a touch stronger when it links out.
                  const tone = inForce
                    ? "font-medium text-heritage"
                    : hasSource
                      ? "text-sable/50"
                      : "text-sable/30";
                  return (
                    <TableCell
                      key={col.key}
                      className={`px-1 py-1.5 text-center ${
                        col.isGroupStart ? DIVIDER : ""
                      }`}
                    >
                      {hasSource ? (
                        <a
                          href={cell.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${col.label} ${inForce ? "in force" : "not in force"} in ${name} — view source`}
                          className={`font-sans text-xs underline decoration-dotted underline-offset-2 outline-none transition focus-visible:ring-2 focus-visible:ring-heritage ${tone} ${
                            inForce
                              ? "decoration-heritage/40 hover:decoration-heritage"
                              : "decoration-sable/30 hover:decoration-sable/50"
                          }`}
                        >
                          {label}
                        </a>
                      ) : (
                        <span className={`font-sans text-xs ${tone}`}>
                          {label}
                        </span>
                      )}
                    </TableCell>
                  );
                })}

                <TableCell
                  className={`${HS_COL} px-2 py-1.5 text-right font-sans tabular-nums text-sable ${DIVIDER}`}
                >
                  {enrollment == null ? (
                    <span className="text-sable/40">not reported</span>
                  ) : (
                    formatNumber(enrollment)
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
