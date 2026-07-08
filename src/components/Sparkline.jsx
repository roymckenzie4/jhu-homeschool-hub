/**
 * Single-state trend chart for the data zone.
 *
 * A single-line Recharts `LineChart` fit to the state's own reporting range, so
 * the line uses the full vertical space and its shape reads clearly. Deliberately
 * a per-state scale, not a shared one — the single-state view wants that state's
 * own trend legible; honest cross-state comparison is ComparisonTrend's job.
 *
 * Matches ComparisonTrend's frame: a light y-axis with nice round ticks for
 * magnitude (exact figures live in the by-year table beside it) and first/last
 * year labels below. The selected-year point is marked with a dot. Non-reporting
 * points (value === null) break the line rather than interpolating across gaps.
 *
 * Renders into 100% of its container; the parent sets the height.
 */

import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { COLORS, schoolYearLabel } from '../config/theme.js';
import { niceTicks } from '../lib/niceScale.js';

/**
 * Inputs:
 *   series: Array<{ year: number, value: number | null }> ascending by year.
 *   selectedYear: number — the year to mark with a dot on the line.
 */

// Fraction of the data range added above and below so the top/bottom points
// don't sit flush against the chart edges. Matches ComparisonTrend.
const DOMAIN_PAD = 0.15;

// Compact axis ticks: 12,345 -> "12K".
const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export default function Sparkline({ series, selectedYear }) {
  // Drop entries with no value before computing the domain so it reflects the
  // visible line, not the padded data array.
  const reporting = series.filter((d) => d.value != null);
  if (reporting.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-sable/40">
        not enough data to plot
      </div>
    );
  }

  // Fit the vertical domain to this state's own range, padded so the extremes
  // don't touch the edges. A flat series falls back to padding around the value.
  const values = reporting.map((d) => d.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const pad = (dataMax - dataMin || dataMax || 1) * DOMAIN_PAD;
  const domainLo = dataMin - pad;
  const domainHi = dataMax + pad;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
            <YAxis
              domain={[domainLo, domainHi]}
              ticks={niceTicks(domainLo, domainHi)}
              width={40}
              tickFormatter={(v) => compact.format(v)}
              tick={{ fontSize: 10, fill: COLORS.sable, opacity: 0.5 }}
              tickLine={false}
              axisLine={{ stroke: COLORS.sable, strokeOpacity: 0.15 }}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke={COLORS.heritage}
              strokeWidth={2}
              connectNulls={false}
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                if (payload?.year !== selectedYear) return null;
                if (payload.value == null) return null;
                if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
                return (
                  <circle
                    key={`selected-${index}`}
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill={COLORS.heritage}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Axis labels reflect the chart's full x-extent (the entire series), not
          just the reporting subset — so a sparse state doesn't read as spanning
          the whole axis. Left pad clears the y-axis gutter. */}
      <div className="mt-1 flex justify-between pl-10 font-sans text-[10px] text-sable/50">
        <span>{schoolYearLabel(series[0].year)}</span>
        <span>{schoolYearLabel(series[series.length - 1].year)}</span>
      </div>
    </div>
  );
}
