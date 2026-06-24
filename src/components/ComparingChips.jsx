/**
 * ComparingChips — the "Comparing" row for the State policies view.
 *
 * Shows one chip per selected state (a level-colored dot + name + remove ✕),
 * a searchable "+ add state" combobox for picking states without the map, the
 * running count against the cap, and a "Clear" action. Selection itself lives
 * in PolicyView; this component only renders it and dispatches add / remove /
 * clear back up.
 *
 * The "+ add state" control is the shared shadcn Combobox (Popover + Command):
 * a type-to-filter list where each row shows the state's level dot and its
 * regulation count (e.g. "3/10"). It stays open after a pick so several states
 * can be added in a row; outside-click / Escape closes it.
 *
 * Props:
 *   - selectedStates  string[]            states in the comparison, in order.
 *   - policyByState    object             shaped policy data, for each row's
 *                                         level dot and count.
 *   - onAdd / onRemove (name)             add / remove a single state.
 *   - onClear          ()                 empty the comparison.
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
import { COMPARE_CAP, REGULATION_COUNT } from "../config/policy.js";
import { levelColor } from "../config/theme.js";
import { STATES } from "../config/states.js";
import RemoveButton from "./RemoveButton.jsx";

// Small level-colored dot, shared by the chips and the combobox rows.
function LevelDot({ level }) {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: levelColor(level) }}
      aria-hidden="true"
    />
  );
}

export default function ComparingChips({
  selectedStates,
  policyByState,
  onAdd,
  onRemove,
  onClear,
}) {
  const count = selectedStates.length;
  const atCap = count >= COMPARE_CAP;

  // States still available to add: all jurisdictions minus those already in the
  // comparison, alphabetical by display name.
  const available = STATES.map((s) => s.name)
    .filter((name) => !selectedStates.includes(name))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-sable/15 pt-3">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/60">
        Comparing
      </span>

      {selectedStates.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1.5 rounded-full border border-sable/20 bg-white py-1 pl-2 pr-1 font-sans text-xs text-sable"
        >
          <LevelDot level={policyByState[name]?.level} />
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
                  const entry = policyByState[name];
                  return (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => onAdd(name)}
                    >
                      <LevelDot level={entry?.level} />
                      <span className="flex-1">{name}</span>
                      <span className="font-sans text-xs tabular-nums text-sable/45">
                        {entry?.total ?? 0}/{REGULATION_COUNT}
                      </span>
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
