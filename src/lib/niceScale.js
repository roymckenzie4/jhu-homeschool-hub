/**
 * "Nice" axis tick values for the enrollment charts.
 *
 * Recharts, given an exact fitted domain, lands ticks on the raw domain
 * extremes — e.g. 59.9K / 206K — which read as arbitrary. `niceTicks` instead
 * returns round, evenly-spaced tick values (50K, 100K, 150K, …) that fall WITHIN
 * the given domain, so the line still fills the plot (the domain is unchanged)
 * but the labels are sensible. Shared by Sparkline and ComparisonTrend.
 */

// Round a range to a "nice" number: 1, 2, 5, or 10 × a power of ten. `round`
// picks the nearest nice number; otherwise rounds up (ceiling).
function niceNum(range, round) {
  const exp = Math.floor(Math.log10(range));
  const frac = range / 10 ** exp;
  let nice;
  if (round) {
    nice = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  } else {
    nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  }
  return nice * 10 ** exp;
}

/**
 * Round tick values within [min, max] at a nice step (~`count` of them). Returns
 * only ticks strictly inside the range, so nothing collides with the edges.
 */
export function niceTicks(min, max, count = 4) {
  if (!(max > min)) return [];
  const step = niceNum((max - min) / count, true);
  // Math.ceil of a small negative (min dips below 0 after domain padding) yields
  // -0, which the axis formats as "-0". Normalize it to a plain 0.
  let first = Math.ceil(min / step) * step;
  if (Object.is(first, -0)) first = 0;
  const ticks = [];
  for (let v = first; v <= max; v += step) ticks.push(v);
  return ticks;
}
