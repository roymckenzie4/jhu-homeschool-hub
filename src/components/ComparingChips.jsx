/**
 * ComparingChips — the shared selection chip row.
 *
 * Topic-neutral: shows one chip per selected state (a colored dot + name +
 * remove ✕), a searchable "+ add state" combobox for picking states without the
 * map, the running count against the cap, and a "Clear" action. Selection lives
 * in the shared context; this component only renders it and dispatches add /
 * remove / clear back up.
 *
 * The chip dot color and the combobox per-row meta come from the ACTIVE topic
 * via `dotColorForState` / `metaForState`, so the same row serves Enrollment
 * (quantile blue, grey for non-reporting) and Regulation (Low/Med/High level).
 * The dot is HTML, so non-reporting must resolve to a solid color — never the
 * map's SVG stripe pattern (the topic's descriptor handles that translation).
 *
 * The "+ add state" control is the shared shadcn Combobox (Popover + Command):
 * a type-to-filter list where each row shows the state's dot and optional meta.
 * It stays open after a pick so several states can be added in a row;
 * outside-click / Escape closes it.
 *
 * Props:
 *   - selectedStates   string[]              states in the cohort, in order.
 *   - dotColorForState (name) => string      CSS color for a state's dot.
 *   - metaForState     (name) => node        optional per-row trailing meta in
 *                                            the combobox (e.g. "3/10"); omit
 *                                            for none.
 *   - onAdd / onRemove (name)                add / remove a single state.
 *   - onClear          ()                    empty the cohort.
 *   - label            string                row eyebrow (default "Comparing").
 */

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./ui/popover.jsx";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "./ui/command.jsx";
import { COMPARE_CAP } from "../config/policy.js";
import { STATES } from "../config/states.js";
import RemoveButton from "./RemoveButton.jsx";

// Small colored dot, shared by the chips and the combobox rows.
function Dot({ color }) {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export default function ComparingChips({
  selectedStates,
  dotColorForState,
  metaForState,
  onAdd,
  onRemove,
  onClear,
  label = "Comparing",
}) {
  const count = selectedStates.length;
  const atCap = count >= COMPARE_CAP;

  // States still available to add: all jurisdictions minus those already in the
  // cohort, alphabetical by display name.
  const available = STATES.map((s) => s.name)
    .filter((name) => !selectedStates.includes(name))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-sable/15 pt-3">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/60">
        {label}
      </span>

      {selectedStates.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1.5 rounded-full border border-sable/20 bg-white py-1 pl-2 pr-1 font-sans text-xs text-sable"
        >
          <Dot color={dotColorForState(name)} />
          {name}
          <RemoveButton onClick={() => onRemove(name)} label={`Remove ${name}`} />
        </span>
      ))}

      {/* Add-state combobox. Hidden at the cap so the limit reads as "no more
          room" rather than an enabled control that silently does nothing. */}
      {!atCap && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-full border border-dashed border-sable/30 px-3 py-1 font-sans text-xs text-sable/60 transition-colors hover:border-sable/50 hover:text-sable"
            >
              + add state
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <Command>
              <CommandInput placeholder="Search states…" />
              <CommandList>
                <CommandEmpty>No states found.</CommandEmpty>
                {available.map((name) => {
                  const meta = metaForState?.(name);
                  return (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => onAdd(name)}
                    >
                      <Dot color={dotColorForState(name)} />
                      <span className="flex-1">{name}</span>
                      {meta != null && (
                        <span className="font-sans text-xs tabular-nums text-sable/45">
                          {meta}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="font-sans text-xs tabular-nums text-sable/50">
          {count} / {COMPARE_CAP}
        </span>
        {count > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="font-sans text-xs text-sable/60 underline decoration-dashed decoration-sable/30 underline-offset-4 transition-colors hover:text-sable hover:decoration-sable/60"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
