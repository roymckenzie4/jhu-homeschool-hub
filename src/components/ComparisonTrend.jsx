/**
 * Multi-line enrollment trend for the comparison mode (2+ states selected).
 *
 * One Recharts line per selected state over the full reporting span, on a SHARED
 * y-domain fit to all selected states' values — so line heights are honestly
 * comparable across states (unlike the single-state Sparkline, which fits each
 * state's own range). This is the payoff of unifying the tool: several states'
 * trajectories read against each other at a glance.
 *
 * Overlaid time series of differently-sized states cluster (a big state dwarfs
 * small ones), so it leans on interaction rather than color alone: lines sit at
 * a slight transparency so overlaps show through, and the highlighted state (set
 * by hovering/pinning its ComparisonLegend chip, lifted to EnrollmentPanel)
 * darkens + thickens while the rest fade — any one state can be isolated, and
 * identity doesn't depend on hue (the colorblind fallback). A light y-axis with
 * nice round ticks carries magnitude; gaps break a line rather than interpolate.
 *
 * Inputs:
 *   rows:    Array<{ year, [stateName]: value|null }> — one row per year, a key
 *            per selected state. Pre-shaped in EnrollmentPanel.
 *   states:  string[] — selected states, in selection order (line order).
 *   colorForState: (name) => string — line color for a state.
 *   highlighted:   string | null — the emphasized state (from the legend).
 */

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "../config/theme.js";
import { niceTicks, nearestYear, yearAxisTicks } from "../lib/niceScale.js";
import YearAxisTick from "./YearAxisTick.jsx";

// Fraction of the shared data range padded above/below so no line runs flush
// against the top/bottom edge. Matches Sparkline.
const DOMAIN_PAD = 0.15;

// Compact axis ticks: 12,345 -> "12K".
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// Line alpha at rest (slightly transparent so overlaps read), the fade for
// non-highlighted lines while one is emphasized, and the emphasized alpha.
const REST_ALPHA = 0.8;
const DIMMED_ALPHA = 0.15;

export default function ComparisonTrend({ rows, states, colorForState, highlighted }) {
  // Shared vertical domain across every selected state's reported values, so
  // all lines sit on one honest scale. Padded so extremes clear the edges.
  const values = [];
  for (const row of rows) {
    for (const state of states) {
      if (row[state] != null) values.push(row[state]);
    }
  }
  if (values.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-sable/40">
        not enough data to plot
      </div>
    );
  }
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const pad = (dataMax - dataMin || dataMax || 1) * DOMAIN_PAD;
  const domainLo = dataMin - pad;
  const domainHi = dataMax + pad;

  // First / ~2020 / last year, so the COVID inflection reads as a positioned
  // label. Numeric x-axis places each tick at its true year, not by index; a
  // dashed reference line at the COVID year marks the inflection outright.
  const years = rows.map((r) => r.year);
  const xTicks = yearAxisTicks(years);
  const covidYear = nearestYear(years);

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
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
          {/* COVID inflection marker, behind the lines so data stays readable. */}
          <ReferenceLine
            x={covidYear}
            stroke={COLORS.sable}
            strokeOpacity={0.25}
            strokeDasharray="3 3"
          />
          {states.map((state) => {
            const isOn = highlighted === state;
            const dim = highlighted != null && !isOn;
            return (
              <Line
                key={state}
                type="linear"
                dataKey={state}
                stroke={colorForState(state)}
                strokeWidth={isOn ? 2.75 : 1.75}
                strokeOpacity={dim ? DIMMED_ALPHA : isOn ? 1 : REST_ALPHA}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
