/**
 * Enrollment topic — descriptor, year metadata, and footer content for the
 * unified shell.
 *
 * The shell renders ONE shared map + legend + chip row above the topic panels.
 * Each topic supplies a "descriptor": the coloring/labeling rules those shared
 * components need (fill, aria label, legend, chip-dot color), so the shell
 * itself stays topic-agnostic. Enrollment's descriptor depends on the active
 * year — the map recolors as the year changes — so it's BUILT by a function
 * rather than frozen as a constant (contrast regulationTopic, which is static).
 *
 * The panel content (detail card, comparison, by-year table) lives in
 * EnrollmentPanel; this module owns only what the shell needs.
 */

import {
  enrollmentByState as byState,
  enrollmentYears as years,
  enrollmentCsvText,
  enrollmentGeneratedAt,
} from "../data/enrollmentLoader.js";
import {
  COLORS,
  MAP_SCALE_MODE,
  schoolYearLabel,
  DOWNLOAD_FILENAME,
  comparisonColor,
  enrollmentCitation,
  LAST_UPDATED,
} from "../config/theme.js";
import { formatNumber, formatUpdatedDate } from "../lib/format.js";
import { buildColorScale } from "../lib/colorScale.js";

// Most recent five years pin as pills in the shell's year selector; older
// years are reachable through its leading "More years" dropdown.
const RECENT_COUNT = 5;
export const RECENT_YEARS = years.slice(-RECENT_COUNT);
export const OLDER_YEARS = years.slice(0, -RECENT_COUNT);
export const DEFAULT_YEAR = RECENT_YEARS[RECENT_YEARS.length - 1];

// Every state's value in every year. Built once: the pooled scale doesn't
// depend on the active year.
const ALL_VALUES = Object.values(byState).flatMap((yearMap) => Object.values(yearMap));
const POOLED_SCALE = buildColorScale(ALL_VALUES);

/**
 * Map a value to its fill on the given color scale (lib/colorScale.js, shared
 * with State Explorer's map). Returns the non-reporting stripe pattern when no
 * value exists — kept out of the map so the map stays classification-agnostic.
 */
function fillForValue(value, scale) {
  return scale?.fillForValue(value) ?? "url(#non-reporting)";
}

/**
 * Build the enrollment descriptor for a given active year. Resolves the year's
 * per-state values and the color scale once, then closes over them for the
 * map fill, legend swatches, and chip-dot color so all three can never drift.
 */
export function buildEnrollmentDescriptor(activeYear) {
  // { stateName: number | null } for the active year.
  const valuesByState = {};
  for (const name of Object.keys(byState)) {
    const v = byState[name][activeYear];
    valuesByState[name] = v == null ? null : v;
  }

  // One scale shared by the map (bucket per state) and the legend (range label
  // per swatch). "pooled" holds it across all years, so a color means the same
  // count in every year; "perYear" rebuilds it from the active year alone (see
  // MAP_SCALE_MODE).
  const pooled = MAP_SCALE_MODE.enrollment === "pooled";
  const scale = pooled ? POOLED_SCALE : buildColorScale(Object.values(valuesByState));
  // The striped "No data" swatch trails the ramp, matching State Explorer.
  const swatches = [...(scale?.swatches ?? []), { label: "No data", kind: "noData" }];

  return {
    fillForState: (name) => fillForValue(valuesByState[name] ?? null, scale),
    ariaLabelForState: (name) => {
      const v = valuesByState[name] ?? null;
      return v != null
        ? `${name}, ${formatNumber(v)} reported homeschoolers`
        : `${name}, no reported data for ${schoolYearLabel(activeYear)}`;
    },
    selectionStroke: COLORS.selectionBorder,
    legend: {
      label: `Students, ${schoolYearLabel(activeYear)}`,
      sublabel: "National quintiles",
      swatches,
    },
    // Chip dot is HTML, so a non-reporting state resolves to a solid grey —
    // never the map's SVG stripe pattern. When 2+ states are selected (the
    // comparison mode), a chip's dot switches to its per-selection COMPARISON
    // color so it matches the trend line / table header / card dot — one
    // identity color across every comparison surface. `selectedStates` is
    // optional context the shell passes in; regulation's descriptor ignores it.
    dotColorForState: (name, { selectedStates } = {}) => {
      if (selectedStates && selectedStates.length >= 2) {
        const i = selectedStates.indexOf(name);
        if (i >= 0) return comparisonColor(i);
      }
      const v = valuesByState[name] ?? null;
      return v == null ? COLORS.nonReportingStripe : fillForValue(v, scale);
    },
    // Combobox per-row meta: the active-year count, or a dash when unreported.
    metaForState: (name) => {
      const v = valuesByState[name] ?? null;
      return formatNumber(v);
    },
    // Title/subtitle/citation/filename for the map's PNG export, so a
    // downloaded map stays attributable after republication.
    mapExport: {
      title: "Reported homeschool enrollment",
      subtitle: `By state · ${schoolYearLabel(activeYear)}`,
      citation: enrollmentCitation(schoolYearLabel(activeYear)),
      // Spring year by convention (2024-25 -> 2025).
      filename: `homeschool-enrollment-map-${activeYear + 1}.png`,
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
  lastUpdated: formatUpdatedDate(enrollmentGeneratedAt, LAST_UPDATED),
};
