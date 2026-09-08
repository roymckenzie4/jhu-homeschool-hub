/**
 * Shared axis/domain math for Sparkline and ComparisonTrend.
 *
 * Recharts type-checks a LineChart's direct children (YAxis/XAxis/
 * ReferenceLine) against its own component references rather than rendering
 * them, so that JSX can't be factored into a shared wrapper component without
 * breaking axis/gridline detection — only the plain data math below is
 * actually shareable between the two charts.
 */

// Fraction of the data range padded above/below so extremes don't sit flush
// against the chart edges.
export const DOMAIN_PAD = 0.15;

// Compact axis ticks: 12,345 -> "12K".
export const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

// Padded [lo, hi] domain around a set of values. A flat series (dataMin ===
// dataMax) falls back to padding around the value itself.
export function paddedDomain(values, pad = DOMAIN_PAD) {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const padAmount = (dataMax - dataMin || dataMax || 1) * pad;
  return [dataMin - padAmount, dataMax + padAmount];
}
