/**
 * ComparingChips — the shared selection chip row.
 *
 * Item-neutral: shows one chip per selected item (a colored dot + name +
 * remove ✕), a searchable "+ add {item}" combobox for picking items without
 * clicking a map shape, the running count against COMPARE_CAP, and a "Clear"
 * action. Selection lives with the caller (a context for the national map's
 * state cohort, local state for State Explorer's region cohort); this
 * component only renders it and dispatches add / remove / clear back up.
 *
 * Originally state-specific (hardcoded to `config/states.js`'s STATES list
 * and "state" copy); generalized so State Explorer's county/district compare
 * can reuse the exact same add-combobox + chip row instead of a near-duplicate
 * component, per the "one shared primitive" convention.
 *
 * The chip dot color and the combobox per-row meta come from the caller via
 * `dotColorForItem` / `metaForItem`, so the same row serves Enrollment
 * (quantile blue, grey for non-reporting), Regulation (Low/Med/High level),
 * and State Explorer (comparison-series color, formatted value). The dot is
 * HTML, so non-reporting must resolve to a solid color — never the map's SVG
 * stripe pattern (the caller's descriptor handles that translation).
 *
 * The "+ add" control is the shared shadcn Combobox (Popover + Command): a
 * type-to-filter list where each row shows the item's dot and optional meta.
 * It stays open after a pick so several items can be added in a row;
 * outside-click / Escape closes it.
 *
 * Props:
 *   - selectedItems      string[]           items in the cohort, in order.
 *   - availableItems     string[]           items still choosable in the
 *                                           add-combobox — caller-supplied
 *                                           (already filtered + sorted) so
 *                                           this component stays ignorant of
 *                                           where the full item list lives.
 *   - dotColorForItem    (name) => string   CSS color for an item's dot.
 *   - metaForItem        (name) => node     optional per-row trailing meta in
 *                                           the combobox (e.g. "3/10", a
 *                                           formatted value); omit for none.
 *   - onAdd / onRemove   (name)             add / remove a single item.
 *   - onClear            ()                 empty the cohort.
 *   - label              string             row eyebrow (default "Comparing").
 *   - itemNounSingular   string             drives "+ add {noun}" (default "state").
 *   - itemNounPlural     string             drives the empty-state prompt and
 *                                           combobox placeholder/empty-text
 *                                           (default "states").
 *   - bordered           boolean            renders the top divider + padding
 *                                           (default true); State Explorer
 *                                           passes false since it renders
 *                                           inside an already-bounded slot,
 *                                           not the shell's full-width strip.
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
import { COMPARE_CAP } from "../config/selection.js";
import RemoveButton from "./RemoveButton.jsx";

// Small colored dot, shared by the chips and the combobox rows (and, via
// export, EnrollmentComparisonCard's row color key).
export function Dot({ color }) {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export default function ComparingChips({
  selectedItems,
  availableItems,
  dotColorForItem,
  metaForItem,
  onAdd,
  onRemove,
  onClear,
  label = "Comparing",
  itemNounSingular = "state",
  itemNounPlural = "states",
  bordered = true,
}) {
  const count = selectedItems.length;
  const atCap = count >= COMPARE_CAP;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${
        bordered ? "border-t border-sable/15 pt-3" : ""
      }`}
    >
      <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
        {label}
      </span>

      {/* Empty state keeps the row at full height (no layout jump) and reads as
          a prompt rather than a blank strip. */}
      {count === 0 && (
        <span className="font-sans text-xs italic text-sable/70">
          Select up to {COMPARE_CAP} {itemNounPlural} on the map to compare
        </span>
      )}

      {selectedItems.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1.5 rounded-full border border-sable/20 bg-white py-1 pl-2 pr-1 font-sans text-xs text-sable"
        >
          <Dot color={dotColorForItem(name)} />
          {name}
          <RemoveButton onClick={() => onRemove(name)} label={`Remove ${name}`} />
        </span>
      ))}

      {/* Add combobox. Hidden at the cap so the limit reads as "no more room"
          rather than an enabled control that silently does nothing. */}
      {!atCap && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-full border border-dashed border-sable/30 px-3 py-1 font-sans text-xs text-sable/70 transition-colors hover:border-sable/50 hover:text-sable"
            >
              + add {itemNounSingular}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <Command>
              <CommandInput placeholder={`Search ${itemNounPlural}…`} />
              <CommandList>
                <CommandEmpty>No {itemNounPlural} found.</CommandEmpty>
                {availableItems.map((name) => {
                  const meta = metaForItem?.(name);
                  return (
                    <CommandItem
                      key={name}
                      value={name}
                      onSelect={() => onAdd(name)}
                    >
                      <Dot color={dotColorForItem(name)} />
                      <span className="flex-1">{name}</span>
                      {meta != null && (
                        <span className="font-sans text-xs tabular-nums text-sable/70">
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
        <span className="font-sans text-xs tabular-nums text-sable/70">
          {count} / {COMPARE_CAP}
        </span>
        {count > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="font-sans text-xs text-sable/70 underline decoration-dashed decoration-sable/30 underline-offset-4 transition-colors hover:text-sable hover:decoration-sable/60"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
