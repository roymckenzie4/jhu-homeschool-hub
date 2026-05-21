/**
 * MapLegend — discrete color swatches with value ranges + non-reporting
 * swatch, shown directly below the map.
 *
 * Because the choropleth uses quintile (equal-count) classification rather
 * than a linear scale, the legend pulls double duty: color encodes a state's
 * rank within reporting states, and the label under each swatch tells the
 * reader the actual magnitudes that bucket covers. This is the standard
 * cartographic move when the underlying data is right-skewed.
 *
 * Props:
 *   - label   string       (e.g., "Students, 2024-25") shown above the ramp.
 *   - breaks  number[]|null  quintile breakpoints from computeQuantileBreaks
 *                          (length = RAMP_STEPS.length + 1). When null we
 *                          render the swatches without ranges.
 */

import { RAMP_STEPS, formatCompact } from '../config/theme.js';

export default function MapLegend({ label, breaks }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 font-sans text-[11px] uppercase tracking-[0.14em] text-sable/70">
      {/* Left cluster: section label sits to the left of the swatch ramp,
          top-aligned with the swatches so the range labels float below
          everything else. */}
      <div className="flex items-start gap-5">
        <span className="font-semibold text-sable/90 leading-3">{label}</span>
        <div className="flex flex-col gap-[3px]" aria-hidden="true">
          <div className="flex gap-[2px]">
            {RAMP_STEPS.map((c) => (
              <span
                key={c}
                className="block h-2.5 w-16 rounded-[1px]"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-[2px] normal-case tracking-normal text-[10px] leading-none text-sable/55">
            {RAMP_STEPS.map((_, i) => (
              <span
                key={i}
                className="block w-16 text-center tabular-nums"
              >
                {rangeLabel(breaks, i, RAMP_STEPS.length)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Re-uses the SVG pattern defined in ChoroplethMap's <defs>. */}
        <svg width="20" height="12" aria-hidden="true">
          <rect width="20" height="12" fill="url(#non-reporting)" />
        </svg>
        <span>Does not publicly report</span>
      </div>
    </div>
  );
}

/**
 * Label for bucket `i` of `total` given the quintile breakpoints.
 * - First bucket : "<{upper}"     (so the smallest reporting states read as
 *                                  "fewer than X" rather than starting at 0)
 * - Middle      : "{lo}–{hi}"
 * - Last         : "{lo}+"
 */
function rangeLabel(breaks, i, total) {
  if (!breaks) return '';
  const lo = breaks[i];
  const hi = breaks[i + 1];
  if (i === 0) return `<${formatCompact(hi)}`;
  if (i === total - 1) return `${formatCompact(lo)}+`;
  return `${formatCompact(lo)}–${formatCompact(hi)}`;
}
