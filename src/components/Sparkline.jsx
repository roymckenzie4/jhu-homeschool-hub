/**
 * Minimal trend sparkline for the State Detail Card.
 *
 * A single-line Recharts `LineChart` wrapped in shadcn's `ChartContainer` so
 * future charts in the project share its theming/CSS-variable plumbing.
 * Everything that would make this look like a "chart" (axes, grid, dots,
 * legend, tooltip) is intentionally disabled — only the line and a small
 * end-point marker remain, plus an optional pair of subtle year labels
 * underneath the line so a reader has a rough time axis.
 *
 * The component renders into 100% of its container's width and height —
 * the parent decides how tall the sparkline should be. See StateDetailCard
 * where it's given `flex-1` so it grows to fill the remaining vertical
 * space alongside the stats above it.
 */

import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { COLORS } from '../config/theme.js';
import { schoolYearLabel } from '../config/theme.js';
import { formatNumber } from '../lib/format.js';

/**
 * Inputs:
 *   series: Array<{ year: number, value: number | null }>
 *           ordered ascending by year (oldest → newest).
 *   maxDeviation: number — the largest |value/anchor - 1| seen across ALL
 *           states in this window. Used to set a shared vertical scale so
 *           equal-percent swings render at equal heights across states.
 *
 * Each sparkline anchors on the state's first reporting value in the
 * window. The Y domain is then [anchor × (1 - maxDeviation × pad),
 * anchor × (1 + maxDeviation × pad)], where `pad` adds visual breathing
 * room above and below the most-extreme line.
 *
 * Non-reporting points (value === null) cause the line to interpolate
 * straight across via Recharts' `connectNulls`. The data is sparse enough
 * (max five years) that any gap visualization would feel heavy.
 */

// Multiplier on maxDeviation so the most-extreme state's line doesn't sit
// flush against the top/bottom edge of its chart area.
const DOMAIN_PAD_MULTIPLIER = 1.1;

export default function Sparkline({ series, maxDeviation, selectedYear }) {
  // Drop entries with no value before computing first/last labels so the
  // axis labels reflect the visible line, not the data array.
  const reporting = series.filter((d) => d.value != null);
  if (reporting.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-sable/40">
        not enough data to plot
      </div>
    );
  }

  const firstYear = reporting[0].year;
  const lastYear = reporting[reporting.length - 1].year;

  // Indices into the FULL series (not the filtered `reporting` array) so
  // Recharts' label renderer can match against the index it passes in.
  const firstIdx = series.findIndex((d) => d.year === firstYear);
  const lastIdx = series.findIndex((d) => d.year === lastYear);

  // For each endpoint, decide whether the label sits above or below the
  // point based on the adjacent line segment. The label is placed on the
  // opposite vertical side from where the line travels, so a steep slope
  // can never run through the digits.
  const firstGoesUp = reporting[1].value > reporting[0].value;
  const lastCameUp =
    reporting[reporting.length - 1].value > reporting[reporting.length - 2].value;
  // "above" = label drawn above the point (y - offset); "below" = below.
  const firstAbove = !firstGoesUp;
  const lastAbove = lastCameUp;

  // Renders a value label only at the first and last reporting points.
  // textAnchor keeps each label inside the chart area horizontally
  // (first anchored to the left edge, last to the right).
  const renderEndpointLabel = ({ x, y, value, index }) => {
    if (value == null) return null;
    if (index !== firstIdx && index !== lastIdx) return null;
    const isFirst = index === firstIdx;
    const above = isFirst ? firstAbove : lastAbove;
    // 6px gap above the point, or 14px below (accounts for text baseline
    // being at the bottom of the glyph, so "below" needs more clearance).
    const yOffset = above ? -6 : 14;
    return (
      <text
        x={x}
        y={y + yOffset}
        textAnchor={isFirst ? 'start' : 'end'}
        fill={COLORS.sable}
        fontSize={10}
        fontFamily="Work Sans, sans-serif"
        fontWeight={600}
      >
        {formatNumber(value)}
      </text>
    );
  };

  // Anchor on the state's first reporting value in the window. The Y range
  // is symmetric around that anchor and scaled to the largest fractional
  // deviation seen across ALL states — so a 5% swing here renders shorter
  // than a 40% swing in California, making cross-state comparison honest.
  const anchor = reporting[0].value;
  const spread = anchor * maxDeviation * DOMAIN_PAD_MULTIPLIER;
  const yMin = anchor - spread;
  const yMax = anchor + spread;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 12, right: 6, bottom: 16, left: 6 }}
          >
            <YAxis hide domain={[yMin, yMax]} />
            <Line
              type="linear"
              dataKey="value"
              stroke={COLORS.heritage}
              strokeWidth={2}
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
              connectNulls
              isAnimationActive={false}
              label={renderEndpointLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex justify-between font-sans text-[10px] text-sable/50">
        <span>{schoolYearLabel(firstYear)}</span>
        <span>{schoolYearLabel(lastYear)}</span>
      </div>
    </div>
  );
}
