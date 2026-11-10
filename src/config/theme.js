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
  selectionBorder: "#1F1A14", // crisp near-black border on a selected state (both map ramps)
  gold: "#FF9E1B", // JHU brand orange (warm accent; category highlights)
  growth: "#008767", // positive YoY indicator — JHU Homewood Green (WCAG-safe on white)
  brick: "#CF4520", // negative YoY indicator
  nonReportingGround: "#E5E5E5", // light gray under the diagonal stripes
  nonReportingStripe: "#CFCFCF", // stripe color for non-reporting states
  zeroValue: "#E5E5E5", // reported count of 0: the no-data ground, solid (no stripes)
};

/**
 * Where each map's color breaks come from (see lib/colorScale.js):
 *   "pooled"  — every year's values at once, so one scale holds across years
 *   "perYear" — only the selected year's values, so the scale shifts by year
 */
export const MAP_SCALE_MODE = {
  enrollment: "pooled",
  stateExplorer: "pooled",
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
 * Categorical ramp for the Regulation choropleth — the JHU Warm Accent
 * yellow→orange→red-orange heat sequence, keyed by regulation level (see
 * config/regulation.js). Straight from the brand guide; deliberately distinct
 * from the blue enrollment ramp so the two views never read as the same data.
 *
 * Single source of truth: the map fills, the legend swatches, and the chip /
 * badge dots all color through `levelColor` so they can never drift.
 */
export const REGULATION_RAMP = {
  Low: "#F1C400", // JHU Gold
  Medium: "#FF9E1B", // JHU Orange
  High: "#F56600", // JHU Red-Orange
};

/** Fill color for a regulation level ("Low" | "Medium" | "High"). */
export function levelColor(level) {
  return REGULATION_RAMP[level] ?? COLORS.nonReportingGround;
}

/**
 * Categorical line colors for the multi-line enrollment comparison — one per
 * selected state, assigned by selection order. DISTINCT hues (not the sequential
 * blue ramp) so overlapping trend lines stay tellable apart; brand blue / orange
 * / red lead, then supplementary hues to reach the compare cap. Provisional
 * pending design feedback on the comparison palette.
 */
export const COMPARISON_SERIES_COLORS = [
  "#002D72", // heritage blue
  "#FF9E1B", // brand orange
  "#0E8A6B", // teal
  "#CF4520", // brick red
  "#6A4C93", // violet
  "#68ACE5", // spirit blue
];

/** Line color for the Nth selected state in the comparison (wraps if needed). */
export function comparisonColor(index) {
  return COMPARISON_SERIES_COLORS[index % COMPARISON_SERIES_COLORS.length];
}

// sRGB relative luminance (WCAG) of a #rgb / #rrggbb color, 0 (black) to 1 (white).
// Exported for the contrast-audit script (scripts/audit-contrast.mjs) in
// addition to labelColorForFill below.
export function relativeLuminance(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const channel = (i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

// WCAG contrast ratio between two #rgb / #rrggbb colors, 1 (no contrast) to 21.
export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Alpha-composites a foreground hex color at `alpha` (0-1) over a solid hex
// background, returning the resulting opaque hex — what a Tailwind
// `text-sable/40`-style utility actually renders as against a given
// background. Needed because relativeLuminance/contrastRatio above only take
// solid colors; opacity-modified text isn't one until it's flattened onto
// whatever's really behind it.
export function compositeOver(fgHex, alpha, bgHex) {
  const parse = (hex) => {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  };
  const fg = parse(fgHex);
  const bg = parse(bgHex);
  const mixed = fg.map((c, i) => Math.round(alpha * c + (1 - alpha) * bg[i]));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Readable label color (white or sable) for a given map fill, picking whichever
 * has the higher WCAG contrast against the fill. Used for the always-on tile
 * labels and the geo hover label so text stays legible across the whole ramp
 * without relying on a heavy outline. Non-hex fills (the diagonal-stripe "no
 * data" pattern, which is light) fall through to sable.
 */
export function labelColorForFill(fill) {
  if (typeof fill !== "string" || !fill.startsWith("#")) return COLORS.sable;
  return contrastRatio(fill, "#FFFFFF") >= contrastRatio(fill, COLORS.sable)
    ? "#FFFFFF"
    : COLORS.sable;
}

// Standard transition for selection/fill changes.
export const TRANSITION_MS = 200;

// Choropleth stroke weights, shared by the national map and State Explorer's
// county/district map. A selected shape is framed by a single crisp dark
// border (MAP_SELECTION_STROKE_WIDTH) on a non-interactive overlay layer; the
// resting weight (MAP_STROKE_REST) is just the white separator between
// unselected shapes. Dim-on-selection is CSS, not a stroke change.
export const MAP_STROKE_REST = 0.6;
export const MAP_SELECTION_STROKE_WIDTH = 2.5;

// State Explorer's single-rect dim overlay (see index.css's .region-dim-
// overlay comment and StateExplorerPanel's RegionMap) — the SAME value the
// CSS class sets, duplicated here because the PNG export needs it as an
// inline style, not a class. html-to-image's snapshot doesn't carry over
// opacity set purely via an external stylesheet class (confirmed live,
// 2026-10-28: the exported rect had its class names but no opacity, so it
// painted fully opaque and hid everything underneath) — RegionMap applies
// this value as an inline style for exactly that reason, keeping the CSS
// class only for its transition timing.
export const REGION_DIM_OPACITY = 0.35;

// Fallback footer "last updated" label for the rare case a topic's snapshot
// fetch has ever failed and the app is running on the bundled CSV, which
// carries no fetch timestamp. The normal path shows the real snapshot date
// (see enrollmentGeneratedAt / regulationGeneratedAt) instead of this.
export const LAST_UPDATED = "June 2026";

// Suggested filename when the user downloads the source CSV from the footer.
export const DOWNLOAD_FILENAME =
  "homeschool-hub-state-enrollment-2000-2026.csv";

// Source attribution baked into downloaded chart images. A republished graph
// gets detached from the site (the audience is journalists/advocates pulling it
// into articles), so the citation has to travel with the image. Placeholder
// wording — JHU will supply final text.
export const CHART_SOURCE_URL =
  "education.jhu.edu/edpolicy/policy-research-initiatives/homeschool-hub";

// Base for the per-state "Read more" link on both detail cards — same domain
// as CHART_SOURCE_URL, one path segment deeper.
export const HOMESCHOOL_HUB_BASE =
  "https://education.jhu.edu/edpolicy/policy-research-initiatives/homeschool-hub/states";
const CHART_SOURCE_RETRIEVED = "July 2026";
export function enrollmentCitation(rangeLabel) {
  return `Source: Homeschool Hub, Johns Hopkins University School of Education. Reported homeschool enrollment, ${rangeLabel}. Retrieved ${CHART_SOURCE_RETRIEVED} from ${CHART_SOURCE_URL}`;
}
export function regulationCitation() {
  return `Source: Homeschool Hub, Johns Hopkins University School of Education. State homeschool regulations in force, current as of 2024–25. Retrieved ${CHART_SOURCE_RETRIEVED} from ${CHART_SOURCE_URL}`;
}
export function stateExplorerCitation(stateName) {
  return `Source: Homeschool Hub, Johns Hopkins University School of Education. Reported homeschool enrollment by sub-state region, ${stateName}. Retrieved ${CHART_SOURCE_RETRIEVED} from ${CHART_SOURCE_URL}`;
}

/**
 * Display the abbreviated school-year label for a starting year integer.
 * 2024 -> "2024-25". Used everywhere we render a year to the user.
 *
 * Joins with a non-breaking hyphen (U+2011, visually identical to "-") so a
 * span never wraps mid-token ("1999-\n00") — in the UI or in the exported PNG
 * labels. Display-only string; never parsed, filenamed, or split downstream.
 */
export function schoolYearLabel(startYear) {
  const endSuffix = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}‑${endSuffix}`;
}
