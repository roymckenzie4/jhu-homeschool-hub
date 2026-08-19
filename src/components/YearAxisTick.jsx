/**
 * Custom x-axis tick for the enrollment trend charts (Sparkline,
 * ComparisonTrend). Renders the school-year label, and dims the COVID reference
 * year so its dashed marker line carries the emphasis rather than the text.
 *
 * Edge ticks anchor inward (first -> start, last -> end) so the outer labels
 * don't clip against the plot edges; the COVID year centers on its position.
 *
 * Recharts clones this element per tick, injecting x / y / payload; the
 * firstYear / lastYear / covidYear props are supplied by the chart.
 */

import { COLORS, schoolYearLabel } from "../config/theme.js";

export default function YearAxisTick({
  x,
  y,
  payload,
  firstYear,
  lastYear,
  covidYear,
}) {
  const { value } = payload;
  const anchor =
    value === firstYear ? "start" : value === lastYear ? "end" : "middle";
  const isCovid = value === covidYear;
  return (
    <text
      x={x}
      y={y}
      dy={10}
      textAnchor={anchor}
      fontSize={10}
      fill={COLORS.sable}
      fillOpacity={isCovid ? 0.3 : 0.5}
    >
      {schoolYearLabel(value)}
    </text>
  );
}
