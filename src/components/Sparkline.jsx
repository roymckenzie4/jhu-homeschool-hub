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

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { COLORS } from '../config/theme.js';
import { niceTicks, nearestYear, yearAxisTicks } from '../lib/niceScale.js';
import YearAxisTick from './YearAxisTick.jsx';

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

  // First / ~2020 / last year. Ticks come from the FULL series (nulls included),
  // so the axis spans the whole timeline and a sparse state's line doesn't read
  // as covering the entire span. Numeric axis positions each tick by true year;
  // a dashed reference line marks the COVID year.
  const years = series.map((d) => d.year);
  const xTicks = yearAxisTicks(years);
  const covidYear = nearestYear(years);

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <YAxis
            domain={[domainLo, domainHi]}
            ticks={niceTicks(domainLo, domainHi)}
            width={40}
            tickFormatter={(v) => compact.format(v)}
            tick={{ fontSize: 10, fill: COLORS.sable, opacity: 0.5 }}
            tickLine={false}
            axisLine={{ stroke: COLORS.sable, strokeOpacity: 0.15 }}
          />
          <XAxis
            dataKey="year"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={xTicks}
            interval={0}
            height={18}
            tick={
              <YearAxisTick
                firstYear={years[0]}
                lastYear={years[years.length - 1]}
                covidYear={covidYear}
              />
            }
            tickLine={false}
            axisLine={{ stroke: COLORS.sable, strokeOpacity: 0.15 }}
          />
          {/* COVID inflection marker, behind the line so the data stays clear. */}
          <ReferenceLine
            x={covidYear}
            stroke={COLORS.sable}
            strokeOpacity={0.25}
            strokeDasharray="3 3"
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
  );
}
