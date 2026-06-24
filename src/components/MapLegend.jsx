/**
 * MapLegend — labeled color key shown directly below a choropleth.
 *
 * View-agnostic: the caller supplies the swatches (color + range/category
 * label) and an optional trailing slot, so the same component serves the
 * Enrollment view (quintile value ranges + a "no public data" note) and the
 * State policies view (Low/Med/High categories + a helper note).
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
 *   - swatches [{ color, label }]  the color key, in display order. `label` is
 *                                  shown centered under each swatch.
 *   - trailing ReactNode           optional right-aligned slot (a note, helper
 *                                  text, or pill). Omitted when null.
 */

export default function MapLegend({ label, swatches, trailing = null }) {
  const [primary, secondary] = label.split(", ");

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 font-sans text-[11px] text-sable/70">
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-[3px]">
          <span className="font-semibold uppercase tracking-widest text-sable/90 leading-3">
            {primary}
          </span>
          {secondary && (
            <span className="text-[10px] leading-none text-sable/55 tabular-nums">
              {secondary}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-[3px]" aria-hidden="true">
          <div className="flex gap-[2px]">
            {swatches.map((s, i) => (
              <span
                key={i}
                className="block h-2.5 w-16 rounded-[1px]"
                style={{ backgroundColor: s.color }}
              />
            ))}
          </div>
          <div className="flex gap-[2px] text-[10px] leading-none text-sable/55">
            {swatches.map((s, i) => (
              <span key={i} className="block w-16 text-center tabular-nums">
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
