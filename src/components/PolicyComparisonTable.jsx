/**
 * PolicyComparisonTable — the side-by-side regulation comparison.
 *
 * States are rows (one per selected state, capped upstream at COMPARE_CAP);
 * the 10 tracked regulations are columns, grouped into Registration /
 * Instruction / Assessment bands, followed by a Homeschoolers (latest reported
 * enrollment) column. Each regulation cell shows a ✓ when the rule is in force
 * (the ✓ links to that rule's source statute) or a — when it isn't. The STATE
 * cell carries a remove ✕ and the state's Low/Med/High level badge.
 *
 * When nothing is selected, a prompt stands in for the table. The "About this
 * data" block below it computes the level distribution live from the data so
 * the caption can never drift from the dataset.
 *
 * Built on the shared shadcn Table. Source links are placeholders for now
 * (see config/policy.js); the live per-cell statutes arrive via the loader.
 *
 * Props:
 *   - selectedStates string[]   states to show as rows, in selection order.
 *   - policyByState   object     shaped regulation data.
 *   - onRemove        (name)     remove a state from the comparison.
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
} from "../config/policy.js";
import { COLORS, levelColor, schoolYearLabel, LAST_UPDATED } from "../config/theme.js";
import { formatNumber } from "../lib/format.js";
import {
  enrollmentLatestYear,
  enrollmentInLatestYear,
} from "../data/enrollmentLoader.js";
import RemoveButton from "./RemoveButton.jsx";
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

// Neutral shade behind the State + Homeschoolers header cells, so the whole
// header band reads as one shaded strip alongside the tinted group cells.
const HEADER_TINT = "bg-sable/[0.03]";

// Brand-derived band tints behind each group's header, so the three regulation
// categories read as distinct column groups (restores the mockup's banding).
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

function EmptyPrompt() {
  return (
    <div className="mt-4 rounded border border-dashed border-sable/25 py-12 text-center font-sans text-sm text-sable/50">
      Select states on the map — or use{" "}
      <span className="font-medium text-sable/70">+ add state</span> — to
      compare their regulations side by side.
    </div>
  );
}

function AboutThisData({ policyByState }) {
  // Live level distribution, so the caption matches the actual dataset.
  const dist = { Low: 0, Medium: 0, High: 0 };
  for (const entry of Object.values(policyByState)) dist[entry.level] += 1;

  return (
    <p className="mt-4 border-t border-sable/10 pt-3 font-sans text-[11px] leading-relaxed text-sable/55">
      <span className="font-semibold text-sable/70">About this data.</span> Each
      state is scored across {REGULATION_COUNT} homeschool regulations grouped
      into registration, instruction, and assessment requirements. A state's
      regulation level reflects how many are in force — Low (0–3), Medium (4–6),
      or High (7–10) — currently {dist.Low} Low, {dist.Medium} Medium, and{" "}
      {dist.High} High. The Homeschoolers column draws on the enrollment dataset
      and shows each state's latest reported figure, or “not reported” where the
      state does not publish one. Figures are illustrative placeholders pending
      the verified dataset. Last updated {LAST_UPDATED}.
    </p>
  );
}

export default function PolicyComparisonTable({
  selectedStates,
  policyByState,
  onRemove,
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="mt-4">
      {selectedStates.length === 0 ? (
        <EmptyPrompt />
      ) : (
        <Table className="text-xs">
          <TableHeader>
            {/* Band row: STATE + the three regulation groups + Homeschoolers. */}
            <TableRow className="border-b border-sable/15 hover:bg-transparent">
              <TableHead
                rowSpan={2}
                className={`h-auto px-2 py-1.5 align-bottom text-[11px] font-semibold uppercase tracking-widest text-sable/70 ${HEADER_TINT}`}
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
                className={`h-auto px-2 py-1.5 text-right align-bottom text-[11px] font-semibold uppercase tracking-widest text-sable/70 ${DIVIDER} ${HEADER_TINT}`}
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
                  className="border-b border-sable/10 hover:bg-sable/[0.02]"
                >
                  <TableCell className="px-2 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <RemoveButton
                        onClick={() => onRemove(name)}
                        label={`Remove ${name}`}
                      />
                      <span className="font-sans font-medium text-sable">
                        {name}
                      </span>
                      <LevelBadge level={entry?.level} />
                      {entry && (
                        <span className="font-sans text-[10px] tabular-nums text-sable/40">
                          {entry.total}/{REGULATION_COUNT}
                        </span>
                      )}
                    </span>
                  </TableCell>

                  {COLUMNS.map((col) => {
                    const cell = entry?.regulations[col.key];
                    const inForce = cell?.value;
                    return (
                      <TableCell
                        key={col.key}
                        className={`px-1 py-1.5 text-center ${
                          col.isGroupStart ? DIVIDER : ""
                        }`}
                      >
                        {inForce ? (
                          <a
                            href={cell.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${col.label} in force in ${name} — view source`}
                            className="font-sans text-xs font-semibold text-heritage underline decoration-transparent underline-offset-2 outline-none transition hover:decoration-heritage/40 focus-visible:ring-2 focus-visible:ring-heritage"
                          >
                            Yes
                          </a>
                        ) : (
                          <span className="font-sans text-xs text-sable/30">
                            No
                          </span>
                        )}
                      </TableCell>
                    );
                  })}

                  <TableCell
                    className={`px-2 py-1.5 text-right font-sans tabular-nums text-sable ${DIVIDER}`}
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
      )}

        <AboutThisData policyByState={policyByState} />
      </div>
    </TooltipProvider>
  );
}
