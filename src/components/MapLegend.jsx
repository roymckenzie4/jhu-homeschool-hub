/**
 * MapLegend — labeled color key shown directly below a choropleth.
 *
 * View-agnostic: the caller supplies the swatches (color + range/category
 * label) and an optional trailing slot, so the same component serves the
 * Enrollment and State Explorer maps (rounded-quintile ranges + a striped
 * "No data" swatch) and the Regulation view (Low/Med/High categories + a
 * helper note).
 *
 * The label cluster is split into two stacked rows that mirror the swatch +
 * range-label stack: the primary label lines up with the swatch row, and an
 * optional secondary line (everything after the first ", ") lines up with the
 * range-label row. This keeps the legend compact enough that the trailing note
 * still fits at narrow desktop widths (~1024–1200px).
 *
 * Props:
 *   - label    string              left label; a ", " splits it into the
 *                                  primary line and a smaller secondary line
 *                                  (e.g. "Students, 2024-25").
 *   - swatches [{ color, label, kind? }]
 *                                  the color key, in display order. `label` is
 *                                  shown centered under each swatch. `kind`
 *                                  marks the two classes outside the ramp,
 *                                  drawn narrower and set apart from it:
 *                                  "zero" (leads the ramp) and "noData"
 *                                  (trails it, diagonal stripes, no color).
 *   - trailing ReactNode           optional right-aligned slot (a note, helper
 *                                  text, or pill). Omitted when null.
 *   - sublabel string              optional secondary line; when given, `label`
 *                                  is shown whole as the primary line (e.g.
 *                                  "Students, 2024-25" over "Arkansas quintiles").
 */

import { useId } from "react";
import { NoDataPattern } from "./NoDataPattern.jsx";

// Width + spacing per swatch kind. "0" and "No data" are fixed, narrower, and
// gapped off the ramp's ends. Ramp swatches are 64px but shrink (down to 52px,
// still wide enough for a "1.4K–2.6K" label on one line) when the row is
// tight, so the trailing slot never wraps under the legend.
const SWATCH_SIZE = {
  zero: "w-8 shrink-0 mr-2",
  noData: "w-12 shrink-0 ml-2",
};
const RAMP_SWATCH_SIZE = "flex-1 basis-16 min-w-13 max-w-16";
function swatchWidth(swatch) {
  return SWATCH_SIZE[swatch.kind] ?? RAMP_SWATCH_SIZE;
}

// Striped "no data" swatch. useId keeps the pattern id unique when the live
// legend and its off-screen PNG-export copy are mounted together.
function NoDataSwatch({ className }) {
  const id = `legend-no-data-${useId().replace(/:/g, "")}`;
  return (
    <svg className={`block h-2.5 ${className}`} aria-hidden="true">
      <defs>
        <NoDataPattern id={id} />
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export default function MapLegend({ label, swatches, trailing = null, sublabel = null }) {
  const [primary, secondary] = sublabel ? [label, sublabel] : label.split(", ");

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 font-sans text-[11px] text-sable/70 lg:flex-nowrap">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex shrink-0 flex-col gap-[3px]">
          <span className="whitespace-nowrap font-semibold uppercase tracking-widest text-sable/90 leading-3">
            {primary}
          </span>
          {secondary && (
            <span className="whitespace-nowrap text-[10px] leading-none text-sable/70 tabular-nums">
              {secondary}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]" aria-hidden="true">
          <div className="flex gap-[2px]">
            {swatches.map((s, i) =>
              s.kind === "noData" ? (
                <NoDataSwatch key={i} className={swatchWidth(s)} />
              ) : (
                <span
                  key={i}
                  className={`block h-2.5 rounded-[1px] ${swatchWidth(s)}`}
                  style={{ backgroundColor: s.color }}
                />
              ),
            )}
          </div>
          <div className="flex gap-[2px] text-[10px] leading-none text-sable/70">
            {swatches.map((s, i) => (
              <span key={i} className={`block whitespace-nowrap text-center tabular-nums ${swatchWidth(s)}`}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {trailing}
    </div>
  );
}
