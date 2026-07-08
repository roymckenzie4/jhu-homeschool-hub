/**
 * Enrollment topic — descriptor, year metadata, and footer content for the
 * unified shell.
 *
 * The shell renders ONE shared map + legend + chip row above the topic panels.
 * Each topic supplies a "descriptor": the coloring/labeling rules those shared
 * components need (fill, aria label, legend, chip-dot color), so the shell
 * itself stays topic-agnostic. Enrollment's descriptor depends on the active
 * year — the map recolors as the year changes — so it's BUILT by a function
 * rather than frozen as a constant (contrast policyTopic, which is static).
 *
 * The panel content (detail card, comparison, by-year table) lives in
 * EnrollmentPanel; this module owns only what the shell needs.
 */

import {
  enrollmentByState as byState,
  enrollmentYears as years,
  enrollmentCsvText,
} from "../data/enrollmentLoader.js";
import {
  RAMP_STEPS,
  COLORS,
  schoolYearLabel,
  computeQuantileBreaks,
  rangeLabel,
  DOWNLOAD_FILENAME,
} from "../config/theme.js";

// Most recent five years pin as pills in the shell's year selector; older
// years are reachable through its leading "More years" dropdown.
const RECENT_COUNT = 5;
export const RECENT_YEARS = years.slice(-RECENT_COUNT);
export const OLDER_YEARS = years.slice(0, -RECENT_COUNT);
export const DEFAULT_YEAR = RECENT_YEARS[RECENT_YEARS.length - 1];

/**
 * Map a reporting value to one of the RAMP_STEPS buckets via quantile breaks.
 * Returns the non-reporting stripe pattern when no value exists — kept out of
 * the map so the map stays classification-agnostic.
 */
function fillForValue(value, breaks) {
  if (value == null) return "url(#non-reporting)";
  if (!breaks) return RAMP_STEPS[0];
  for (let i = 0; i < RAMP_STEPS.length; i += 1) {
    if (value <= breaks[i + 1]) return RAMP_STEPS[i];
  }
  return RAMP_STEPS[RAMP_STEPS.length - 1];
}

/**
 * Build the enrollment descriptor for a given active year. Computes the year's
 * per-state values and quantile breaks once, then closes over them for the
 * map fill, legend swatches, and chip-dot color so all three can never drift.
 */
export function buildEnrollmentDescriptor(activeYear) {
  // { stateName: number | null } for the active year.
  const valuesByState = {};
  for (const name of Object.keys(byState)) {
    const v = byState[name][activeYear];
    valuesByState[name] = v == null ? null : v;
  }

  // Quantile break points shared by the map (bucket per state) and the legend
  // (range label per swatch).
  const breaks = computeQuantileBreaks(Object.values(valuesByState));

  const swatches = RAMP_STEPS.map((color, i) => ({
    color,
    label: rangeLabel(breaks, i, RAMP_STEPS.length),
  }));

  return {
    fillForState: (name) => fillForValue(valuesByState[name] ?? null, breaks),
    ariaLabelForState: (name) => {
      const v = valuesByState[name] ?? null;
      return v != null
        ? `${name}, ${v.toLocaleString()} reported homeschoolers`
        : `${name}, no reported data for ${schoolYearLabel(activeYear)}`;
    },
    selectionStroke: COLORS.sable,
    legend: {
      label: `Students, ${schoolYearLabel(activeYear)}`,
      swatches,
      trailing: (
        <div className="flex items-center gap-2 whitespace-nowrap text-sable/60">
          {/* Self-contained stripe swatch (its own <defs>), mirroring
              ChoroplethMap's non-reporting pattern. Doesn't reference the map's
              pattern so it renders correctly inside the off-screen PNG export,
              which doesn't carry the map's defs. */}
          <svg width="20" height="12" aria-hidden="true">
            <defs>
              <pattern
                id="legend-non-reporting"
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill={COLORS.nonReportingGround} />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke={COLORS.nonReportingStripe}
                  strokeWidth="2"
                />
              </pattern>
            </defs>
            <rect width="20" height="12" fill="url(#legend-non-reporting)" />
          </svg>
          <span>No public data</span>
        </div>
      ),
    },
    // Chip dot is HTML, so a non-reporting state resolves to a solid grey —
    // never the map's SVG stripe pattern.
    dotColorForState: (name) => {
      const v = valuesByState[name] ?? null;
      return v == null ? COLORS.nonReportingStripe : fillForValue(v, breaks);
    },
    // Combobox per-row meta: the active-year count, or a dash when unreported.
    metaForState: (name) => {
      const v = valuesByState[name] ?? null;
      return v == null ? "—" : v.toLocaleString();
    },
  };
}

// Footer content for the shared footer (placeholder copy; JHU owns final copy).
export const enrollmentFooter = {
  about: (
    <>
      The Homeschool Hub aggregates publicly reported state-level homeschool
      enrollment counts. Non-reporting states either decline to track homeschool
      enrollment or do not release it publicly, so national totals reflect
      reporting states only and should be read as a floor, not a complete count.
    </>
  ),
  csvText: enrollmentCsvText,
  downloadFilename: DOWNLOAD_FILENAME,
};
