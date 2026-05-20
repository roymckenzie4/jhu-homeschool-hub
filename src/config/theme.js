/**
 * Single source of truth for theme values used at runtime in JavaScript
 * (color ramps, chart strokes, transition durations, etc.).
 *
 * Tailwind utility classes mirror these in tailwind.config.js — keep both
 * in sync when you change anything here.
 */

// JHU brand palette, per CLAUDE.md.
export const COLORS = {
  heritage: '#002D72', // primary; choropleth ramp endpoint; card border
  spirit: '#68ACE5',   // choropleth ramp start
  sable: '#31261D',    // headline number, body text
  gold: '#F1C400',     // positive YoY indicator
  brick: '#CF4520',    // negative YoY indicator
  nonReportingGround: '#E5E5E5', // light gray under the diagonal stripes
  nonReportingStripe: '#CFCFCF', // stripe color for non-reporting states
};

// Standard transition for selection/fill changes.
export const TRANSITION_MS = 200;

// Hardcoded footer label — easy to bump when new data is loaded.
export const LAST_UPDATED = 'March 2026';

/**
 * Display the abbreviated school-year label for a starting year integer.
 * 2024 -> "2024-25". Used everywhere we render a year to the user.
 */
export function schoolYearLabel(startYear) {
  const endSuffix = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endSuffix}`;
}
