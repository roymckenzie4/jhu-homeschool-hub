/**
 * Year selector — a segmented control of connected buttons. A leading
 * "More years" dropdown sits on the left and lists every older reporting
 * year; the remaining segments are the five most-recent years. Together
 * the row reads left-to-right chronologically (older → newer).
 *
 * When the user picks a year from the dropdown, the leading segment
 * relabels to that year and takes the active style. Clicking a recent-year
 * pill returns the leading segment to its "More years ▾" idle state.
 *
 * Borders overlap via `-ml-px` so adjacent segments share a single border
 * line, matching the mockup's connected look.
 */

import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.jsx";
import { schoolYearLabel } from "../config/theme.js";
import { cn } from "../lib/utils.js";

// Uniform width on every segment so the row reads as a balanced strip and
// the dropdown trigger doesn't reflow when its label flips between "More"
// and a year like "2010-11". Sized to fit a school-year label comfortably
// alongside the dropdown chevron.
const SEGMENT_WIDTH = "w-[84px]";

export default function YearSelector({
  recentYears,
  olderYears,
  activeYear,
  onChange,
}) {
  const activeIsRecent = recentYears.includes(activeYear);
  // Older years rendered most-recent-first in the dropdown so the years
  // closest to the visible pill row sit at the top, minimizing eye travel.
  const dropdownYears = [...olderYears].sort((a, b) => b - a);

  return (
    <div className="flex items-center">
      <span className="mr-3 font-sans text-[11px] font-medium uppercase tracking-widest text-sable/60">
        Year
      </span>
      <div className="flex">
        {/* Leading dropdown segment. Stays in the connected row; its label
            and style flip depending on whether the active year is recent. */}
        <Select
          value={activeIsRecent ? "" : String(activeYear)}
          onValueChange={(v) => onChange(Number(v))}
        >
          <SelectTrigger
            aria-label="Choose an older year"
            className={cn(
              SEGMENT_WIDTH,
              "whitespace-nowrap rounded-l border border-sable/20 px-2.5 py-0.5 font-sans text-xs tabular-nums transition",
              !activeIsRecent
                ? "z-10 border-heritage bg-heritage text-white"
                : "bg-white text-sable hover:bg-sable/5 justify-left",
            )}
          >
            <SelectValue placeholder="More">
              {!activeIsRecent && schoolYearLabel(activeYear)}
            </SelectValue>
            <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
          </SelectTrigger>
          <SelectContent align="start">
            {dropdownYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {schoolYearLabel(year)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {recentYears.map((year, i) => {
          const active = year === activeYear;
          const last = i === recentYears.length - 1;
          return (
            <button
              key={year}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(year)}
              className={cn(
                SEGMENT_WIDTH,
                "-ml-px border border-sable/20 px-2.5 py-0.5 text-center font-sans text-xs tabular-nums transition",
                last && "rounded-r",
                active
                  ? "z-10 border-heritage bg-heritage text-white"
                  : "bg-white text-sable hover:bg-sable/5",
              )}
            >
              {schoolYearLabel(year)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
