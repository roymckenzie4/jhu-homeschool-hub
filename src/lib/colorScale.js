/**
 * Choropleth color scale shared by the national Enrollment map and State
 * Explorer's county/district map.
 *
 * Classification is rounded quintiles: the values are split into five
 * equal-count groups (enrollment is heavily right-skewed, so a linear split
 * would crowd most places into the bottom one or two colors), and each break
 * is then rounded to a readable number. Values are classified against the
 * ROUNDED breaks, so the legend labels are exactly true and the groups are
 * approximately, not exactly, equal in size.
 *
 * The caller chooses which values the breaks come from. Passing every year's
 * values at once ("pooled", see MAP_SCALE_MODE in config/theme.js) holds one
 * scale across all years, so a color means the same count in every year and
 * change over time reads as change in color.
 *
 * Zero is its own class, outside the quintiles: it gets a solid grey swatch
 * labeled "0" and is excluded from the break calculation. Missing values
 * (null) are left to the caller, since each map draws "no data" its own way.
 */

import { RAMP_STEPS, COLORS } from "../config/theme.js";

// Bounds at or above this read in thousands ("2.9K", "17K") so national-scale
// labels fit under their swatches.
const COMPACT_FROM = 1000;

// Legend number: exact under 1,000, then thousands with at most one decimal
// (bounds are rounded to two significant figures, so nothing is lost).
function formatBound(n) {
  if (n < COMPACT_FROM) return String(n);
  if (n < 10000) return `${Number((n / 1000).toFixed(1))}K`;
  return `${Math.round(n / 1000)}K`;
}

/**
 * Round a break to a readable value: whole number under 20, nearest 5 under
 * 100, nearest 10 under 1,000, two significant figures from there up
 * (1,366 → 1,400; 135,210 → 140,000). Small-count states keep exact breaks,
 * since rounding 7 → 5 or 13 → 15 would badly unbalance their groups.
 */
export function roundBreak(value) {
  if (value < 20) return Math.round(value);
  if (value < 100) return Math.round(value / 5) * 5;
  if (value < 1000) return Math.round(value / 10) * 10;
  return Number(value.toPrecision(2));
}

/**
 * Upper bound of each color bucket except the last (which is open-ended),
 * ascending and de-duplicated. Usually four bounds → five buckets.
 *
 * When rounding lands two bounds on the same number (possible for states with
 * very small counts), the empty bucket between them is dropped and the scale
 * has fewer buckets. Bounds below the smallest value or at/above the largest
 * are dropped for the same reason: they'd leave a bucket nothing can fall in.
 */
function computeBounds(positives, stepCount) {
  const sorted = positives.slice().sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bounds = [];
  for (let i = 1; i < stepCount; i += 1) {
    const idx = Math.min(
      Math.floor((i * sorted.length) / stepCount),
      sorted.length - 1,
    );
    const bound = roundBreak(sorted[idx]);
    if (bound < min || bound >= max) continue;
    if (bounds.length && bound <= bounds[bounds.length - 1]) continue;
    bounds.push(bound);
  }
  return bounds;
}

/**
 * Ramp colors for a scale with `bucketCount` buckets. Five buckets use the
 * full ramp; fewer are spread across it so the lightest and darkest colors
 * always anchor the ends.
 */
function rampColors(bucketCount) {
  if (bucketCount === RAMP_STEPS.length) return RAMP_STEPS;
  if (bucketCount === 1) return [RAMP_STEPS[RAMP_STEPS.length - 1]];
  const last = RAMP_STEPS.length - 1;
  return Array.from(
    { length: bucketCount },
    (_, i) => RAMP_STEPS[Math.round((i * last) / (bucketCount - 1))],
  );
}

/**
 * Build a color scale from a list of values (nulls and non-numbers ignored).
 *
 * Returns:
 *   - fillForValue(v)  ramp color for a positive count, the zero grey for 0,
 *                      or null when v is missing (caller draws "no data").
 *   - swatches         [{ color, label }] for the legend, in display order:
 *                      the "0" swatch first (only when the data contains a
 *                      zero; `kind: "zero"` so the legend sets it apart
 *                      from the ramp), then each bucket's range
 *                      ("1–60", "61–100", …, "341+"). Ranges never overlap.
 *
 * Returns null when there are no values at all.
 */
export function buildColorScale(values, stepCount = RAMP_STEPS.length) {
  const numbers = values.filter((v) => v != null && Number.isFinite(v));
  if (numbers.length === 0) return null;
  const positives = numbers.filter((v) => v > 0);
  const hasZero = positives.length < numbers.length;

  const bounds = positives.length ? computeBounds(positives, stepCount) : [];
  const colors = positives.length ? rampColors(bounds.length + 1) : [];

  const fillForValue = (v) => {
    if (v == null || !Number.isFinite(v)) return null;
    if (v <= 0) return COLORS.zeroValue;
    const i = bounds.findIndex((bound) => v <= bound);
    return colors[i === -1 ? colors.length - 1 : i];
  };

  // Counts are whole numbers, so under 1,000 each bucket starts one above the
  // previous bound — "1–60", "61–100" — and no value sits on two labels. From
  // 1,000 up, labels share endpoints ("7K–17K", "17K–28K"): at that scale the
  // exact edge doesn't matter and "17,001" wouldn't fit.
  const swatches = colors.map((color, i) => {
    let lo = 1;
    if (i > 0) {
      const prev = bounds[i - 1];
      lo = prev < COMPACT_FROM ? prev + 1 : prev;
    }
    const label =
      i === bounds.length
        ? `${formatBound(lo)}+`
        : `${formatBound(lo)}–${formatBound(bounds[i])}`;
    return { color, label };
  });
  if (hasZero) {
    swatches.unshift({ color: COLORS.zeroValue, label: "0", kind: "zero" });
  }

  return { fillForValue, swatches };
}
