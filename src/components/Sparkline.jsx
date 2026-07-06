/**
 * Single-state trend chart for the State Detail Card.
 *
 * A single-line Recharts `LineChart` wrapped in shadcn's charting plumbing so
 * future charts in the project share its theming. Beyond a bare sparkline it
 * fits the line to the state's own range and labels the first/last reported
 * values, so a reader gets both the shape of the trend and its magnitude.
 *
 * Scale: the y-domain is fit to THIS state's own reporting range (with padding)
 * so the line uses the full vertical space. That's deliberately different from a
 * shared cross-state scale — the single-state detail wants the state's own trend
 * to be readable; honest cross-state comparison is the job of the (future)
 * multi-line comparison view, which sets its own shared domain.
 *
 * The component renders into 100% of its container's width and height — the
 * parent decides how tall it should be (see StateDetailCard).
 */

import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { COLORS } from '../config/theme.js';
import { schoolYearLabel } from '../config/theme.js';
import { formatNumber } from '../lib/format.js';

/**
 * Inputs:
 *   series: Array<{ year: number, value: number | null }>
 *           ordered ascending by year (oldest → newest).
 *   selectedYear: number — the year to mark with a dot on the line.
 *
 * Non-reporting points (value === null) break the line — Recharts skips those
 * segments rather than interpolating across them, so gaps in a state's
 * reporting history stay visible.
 */

// Fraction of the data range added above and below so the top/bottom points
// (and their labels) don't sit flush against the chart edges.
const DOMAIN_PAD = 0.15;

// Left/right gutter reserved for the start- and end-value labels, which sit
// outside the plotting area. Sized to fit a six-figure comma-formatted number
// at LABEL_FONT_SIZE.
const LABEL_GUTTER = 52;

// Horizontal gap between an endpoint and its value label. The labels sit in the
// outer margins (start in the left gutter, end in the right gutter), clear of
// the line's x-range entirely — so a steep endpoint can never run through the
// digits, no above/below guessing required.
const LABEL_GAP = 5;
const LABEL_FONT_SIZE = 12;

export default function Sparkline({ series, selectedYear }) {
  // Drop entries with no value before computing the domain and endpoint labels
  // so both reflect the visible line, not the padded data array.
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

  // Fit the vertical domain to this state's own range, padded so the extremes
  // don't touch the edges. A flat series (single distinct value) falls back to
  // padding around that value so it renders as a centered flat line.
  const values = reporting.map((d) => d.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const pad = (dataMax - dataMin || dataMax || 1) * DOMAIN_PAD;
  const yMin = dataMin - pad;
  const yMax = dataMax + pad;

  // Value label at the first and last reporting points only, parked in the
  // outer margin on that side (end-anchored left of the first point, start-
  // anchored right of the last point) and vertically centered on the point.
  const renderEndpointLabel = ({ x, y, value, index }) => {
    if (value == null) return null;
    if (index !== firstIdx && index !== lastIdx) return null;
    const isFirst = index === firstIdx;
    return (
      <text
        x={isFirst ? x - LABEL_GAP : x + LABEL_GAP}
        y={y}
        textAnchor={isFirst ? 'end' : 'start'}
        dominantBaseline="central"
        fill={COLORS.sable}
        fontSize={LABEL_FONT_SIZE}
        fontFamily="Work Sans, sans-serif"
        fontWeight={700}
      >
        {formatNumber(value)}
      </text>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 14, right: LABEL_GUTTER, bottom: 8, left: LABEL_GUTTER }}
          >
            {/* Hidden axis: supplies the fit-to-range vertical scale without
                drawing a spine or ticks. The bold endpoint values carry the
                magnitudes; no gridlines, so nothing reads as a stray rule. */}
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
              isAnimationActive={false}
              label={renderEndpointLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Axis labels reflect the chart's full x-extent (the entire series),
          not just the reporting subset — otherwise a state with sparse
          reporting like Connecticut reads as if its line spans the whole
          axis when it actually only covers a fraction. */}
      <div className="mt-1 flex justify-between font-sans text-[10px] text-sable/50">
        <span>{schoolYearLabel(series[0].year)}</span>
        <span>{schoolYearLabel(series[series.length - 1].year)}</span>
      </div>
    </div>
  );
}
