/**
 * Legend for the multi-line ComparisonTrend — a compact colored-swatch + postal
 * chip per selected state. Lives in the trend column's heading row (right of the
 * "Trends" label), so it doesn't eat the chart's height.
 *
 * Interactive, and the single control point for the trend's highlight state
 * (the hover/pin lives in EnrollmentPanel and is shared with the chart, so the
 * two stay in lockstep):
 *   - hover a chip  -> preview-highlight that line (fades the rest)
 *   - click a chip  -> pin that highlight so it persists after the mouse leaves;
 *                      click again to unpin.
 *
 * `highlighted` is the currently-emphasized state (hover taking precedence over
 * pin, resolved by the parent). The emphasized chip stays full-strength; the
 * rest dim.
 *
 * Inputs:
 *   states:        string[] — selected states, in selection order.
 *   colorForState: (name) => string — swatch color (matches the line).
 *   highlighted:   string | null — the emphasized state.
 *   onHover:       (name | null) — hover enter (name) / leave (null).
 *   onTogglePin:   (name) — click to pin/unpin.
 */

import { BY_NAME } from "../config/states.js";

export default function ComparisonLegend({
  states,
  colorForState,
  highlighted,
  onHover,
  onTogglePin,
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1">
      {states.map((state) => {
        const dim = highlighted != null && highlighted !== state;
        return (
          <button
            key={state}
            type="button"
            onMouseEnter={() => onHover(state)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(state)}
            onBlur={() => onHover(null)}
            onClick={() => onTogglePin(state)}
            aria-pressed={highlighted === state}
            className={`inline-flex items-center gap-1.5 font-sans text-[11px] tabular-nums transition-opacity ${
              dim ? "opacity-30" : "opacity-100"
            } ${highlighted === state ? "font-semibold text-sable" : "text-sable/80"}`}
          >
            <span
              className="h-0.5 w-3.5 rounded-full"
              style={{ backgroundColor: colorForState(state) }}
              aria-hidden="true"
            />
            {BY_NAME[state]?.postal ?? state}
          </button>
        );
      })}
    </div>
  );
}
