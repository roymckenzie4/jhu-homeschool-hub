/**
 * Single source of truth for theme values used at runtime in JavaScript
 * (color ramps, chart strokes, transition durations, etc.).
 *
 * Tailwind utility classes mirror these in the @theme block in
 * src/styles/index.css — keep both in sync when you change anything here.
 */

// JHU brand palette
export const COLORS = {
  heritage: "#002D72", // primary; choropleth ramp endpoint; card border
  spirit: "#68ACE5", // choropleth ramp start
  sable: "#31261D", // headline number, body text
  gold: "#FF9E1B", // positive YoY indicator (JHU brand orange — more legible on white than the brand yellow)
  brick: "#CF4520", // negative YoY indicator
  nonReportingGround: "#E5E5E5", // light gray under the diagonal stripes
  nonReportingStripe: "#CFCFCF", // stripe color for non-reporting states
};

/**
 * Discrete 5-step color ramp for the choropleth, sampled along
 * SPIRIT → HERITAGE. Sampled once here so the legend swatches and the map
 * fills are guaranteed to use the same colors.
 *
 * To change the bucket count, edit this array — the map and legend pick it up
 * automatically.
 */
export const RAMP_STEPS = [
  "#A9CDED", // lightest — confident enough to read against the white background
  "#7CAFDD",
  "#4889C8",
  "#1F5CA3",
  "#002D72", // heritage
];

/**
 * Categorical ramp for the State policies choropleth — the JHU Warm Accent
 * yellow→orange→red heat sequence, keyed by regulation level (see
 * config/policy.js). Straight from the brand guide; deliberately distinct from
 * the blue enrollment ramp so the two views never read as the same data.
 *
 * Single source of truth: the map fills, the legend swatches, and the chip /
 * badge dots all color through `levelColor` so they can never drift.
 */
export const POLICY_RAMP = {
  Low: "#F1C400", // JHU Gold
  Medium: "#FF9E1B", // JHU Orange
  High: "#CF4520", // JHU Red
};

/** Fill color for a regulation level ("Low" | "Medium" | "High"). */
export function levelColor(level) {
  return POLICY_RAMP[level] ?? COLORS.nonReportingGround;
}

// Standard transition for selection/fill changes.
export const TRANSITION_MS = 200;

// Hardcoded footer label — easy to bump when new data is loaded.
export const LAST_UPDATED = "June 2026";

// Suggested filename when the user downloads the source CSV from the footer.
export const DOWNLOAD_FILENAME =
  "homeschool-hub-state-enrollment-2000-2026.csv";

/**
 * Display the abbreviated school-year label for a starting year integer.
 * 2024 -> "2024-25". Used everywhere we render a year to the user.
 */
export function schoolYearLabel(startYear) {
  const endSuffix = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endSuffix}`;
}

/**
 * Compute quintile (or N-tile) break points for a list of numeric values.
 * Returns the N+1 breakpoints that delimit RAMP_STEPS.length buckets, e.g.
 * `[min, q1, q2, q3, q4, max]` for a 5-step ramp.
 *
 * Bucket i contains values in [breaks[i], breaks[i+1]] (the last bucket is
 * closed on both ends). Equal-count classification is preferred over linear
 * here because state homeschool enrollment is heavily right-skewed — a
 * linear scale collapses ~35 of the reporting states into the bottom two
 * buckets, hiding most of the variation we want to show.
 *
 * The legend pairs each swatch with its value range so readers see both the
 * rank (color) and the magnitude (label).
 */
export function computeQuantileBreaks(values, stepCount = RAMP_STEPS.length) {
  const sorted = values
    .filter((v) => v != null && Number.isFinite(v))
    .slice()
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const breaks = [sorted[0]];
  for (let i = 1; i < stepCount; i += 1) {
    const idx = Math.floor((i * sorted.length) / stepCount);
    breaks.push(sorted[Math.min(idx, sorted.length - 1)]);
  }
  breaks.push(sorted[sorted.length - 1]);
  return breaks;
}

/**
 * Compact number formatter for the legend ranges. Tuned for the data range
 * we actually see (hundreds → low hundreds of thousands).
 *   942   -> "940"
 *   1234  -> "1.2K"
 *   12345 -> "12K"
 */
export function formatCompact(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n / 10) * 10);
  if (abs < 10000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n / 1000)}K`;
}

/**
 * Build the label for quantile bucket `i` of `total`, given the breakpoints
 * from computeQuantileBreaks. Used to label each legend swatch in the
 * Enrollment view:
 * - First bucket : "<{upper}"   (smallest reporting states read as "fewer
 *                                than X" rather than starting at 0)
 * - Middle       : "{lo}–{hi}"
 * - Last         : "{lo}+"
 */
export function rangeLabel(breaks, i, total) {
  if (!breaks) return "";
  const lo = breaks[i];
  const hi = breaks[i + 1];
  if (i === 0) return `<${formatCompact(hi)}`;
  if (i === total - 1) return `${formatCompact(lo)}+`;
  return `${formatCompact(lo)}–${formatCompact(hi)}`;
}
