/**
 * Derives year-level aggregates from the `byState` shape produced by parseCsv.
 *
 * For each year present in the data, computes:
 *   - total:          sum of all reporting (non-null) state values that year
 *   - reportingCount: number of jurisdictions with a non-null value that year
 *                     (DC is counted; the denominator in the UI is 51)
 *   - rankByState:    { stateName: 1-based rank } — higher value = lower rank #
 *                     (rank 1 = largest reported enrollment that year)
 *
 * National rank for a state is intentionally NOT precomputed onto byState —
 * it's read out of byYear[year].rankByState at consumption time.
 */

import { BY_NAME } from '../config/states.js';

/**
 * Year-over-year percent change between two enrollment values.
 * Returns null when a comparison isn't possible (either side missing, or
 * the prior value is zero). Consumers render null as "—".
 *
 * Result is a number, not a string — formatting lives in `lib/format.js`.
 *   computeYoY(22150, 20740) -> 6.799...   (rendered as "+6.8%")
 *   computeYoY(20740, 21430) -> -3.220...  (rendered as "-3.2%")
 */
export function computeYoY(current, previous) {
  if (current == null || previous == null) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Largest fractional deviation from anchor seen across all states within a
 * given year window. Used to set a shared vertical scale on every state
 * sparkline so cross-state visual comparison is honest — equal-percent
 * swings render at equal heights.
 *
 * For each state, the "anchor" is its first reporting value within the
 * window (so a state that didn't report in the earliest displayed year
 * still gets a sensible local anchor rather than being excluded). For
 * every reporting year after that anchor, we take |value/anchor - 1| and
 * return the max.
 *
 * Returns 0 if no state has enough data to compute any deviation — callers
 * should treat that as "no scale," typically by falling back to a flat-line
 * presentation.
 */
export function computeMaxDeviation(byState, windowYears) {
  let max = 0;
  for (const name of Object.keys(byState)) {
    const values = byState[name];
    // Find the first reporting year inside the window — that's the anchor.
    let anchor = null;
    for (const y of windowYears) {
      if (values[y] != null) { anchor = values[y]; break; }
    }
    if (anchor == null || anchor === 0) continue;

    for (const y of windowYears) {
      const v = values[y];
      if (v == null) continue;
      const dev = Math.abs(v / anchor - 1);
      if (dev > max) max = dev;
    }
  }
  return max;
}

/**
 * Pick a centered window of years around a selected year, clamped to the
 * bounds of the available data so the result always has `size` entries
 * (assuming the underlying series is long enough).
 *
 * Default: 2 years on either side of the selected year. If the selection
 * sits near the start of the series, the window shifts forward; near the
 * end, it shifts backward. The selected year is always included.
 *
 * Returns an ascending array of year integers. Pass `years` as the full
 * ascending series from parseCsv.
 */
export function windowAroundYear(years, selectedYear, size = 5) {
  if (years.length <= size) return [...years];
  const idx = years.indexOf(selectedYear);
  if (idx === -1) return years.slice(-size);
  const half = Math.floor(size / 2);
  let start = idx - half;
  let end = start + size;
  if (start < 0) { end -= start; start = 0; }
  if (end > years.length) { start -= end - years.length; end = years.length; }
  return years.slice(start, end);
}

export function deriveByYear(byState) {
  const yearsSet = new Set();
  for (const name of Object.keys(byState)) {
    for (const y of Object.keys(byState[name])) yearsSet.add(Number(y));
  }
  const years = [...yearsSet].sort((a, b) => a - b);

  const byYear = {};

  for (const year of years) {
    let total = 0;
    let reportingCount = 0;

    // Collect [name, value] pairs for ranking — only reporting states.
    const reporting = [];

    for (const name of Object.keys(byState)) {
      const v = byState[name][year];
      if (v == null) continue;
      total += v;
      reporting.push([name, v]);
      // Count every known jurisdiction (50 states + DC) toward the reporting tally.
      if (BY_NAME[name]) reportingCount += 1;
    }

    reporting.sort((a, b) => b[1] - a[1]);
    const rankByState = {};
    reporting.forEach(([name], i) => {
      rankByState[name] = i + 1;
    });

    byYear[year] = { total, reportingCount, rankByState };
  }

  return byYear;
}
