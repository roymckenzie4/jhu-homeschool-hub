/**
 * Parses the wide-format school enrollment CSV published by the Homeschool Hub
 * and pivots it into shapes the UI can consume directly.
 *
 * Input shape (as published):
 *   School Year, AR, CA, CO, ...
 *   1999-2000,  "11,038", , "9,719", ...
 *   ...
 *
 * Output:
 *   byState: { "Arkansas": { 2024: 35419, 2023: 27528, ... }, ... }
 *   years:   [2020, 2021, 2022, 2023, 2024] (sorted ascending, integers — start year)
 *
 * Normalization rules (per PLAN.md):
 *   - "35,419"   → 35419       (strip thousands separators and stray quotes)
 *   - "" / "   " → null         (preserves "not reporting" — never coerced to 0)
 *   - "2024-2025" → start year 2024 (internal int key; display label applied at render)
 *   - The in-flight "2025-2026" row is dropped for this prototype (partial data).
 */

import { csvParse } from 'd3-dsv';
import { BY_POSTAL } from '../config/states.js';

// In-flight school year that the published data only partially covers.
// Dropping this is intentional — see CLAUDE.md's data section.
const PARTIAL_YEAR_ROW = '2025-2026';

/** Strip thousands separators and parse to a number, or null for empty cells. */
function normalizeCell(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === '') return null;
  const stripped = trimmed.replace(/,/g, '');
  const n = Number(stripped);
  return Number.isFinite(n) ? n : null;
}

/** "2024-2025" → 2024. Returns null if the label doesn't look like a school year. */
function parseSchoolYear(label) {
  const match = String(label).trim().match(/^(\d{4})-\d{4}$/);
  return match ? Number(match[1]) : null;
}

/**
 * Parse the wide CSV string and return { byState, years }.
 * - `byState` is keyed by full state name (matches BY_NAME in config/states.js).
 * - Every state in BY_POSTAL gets an entry, even if all values are null.
 */
export function parseCsv(csvText) {
  const rows = csvParse(csvText);
  const columns = rows.columns.slice(1); // drop "School Year"

  // Initialize byState with an empty bucket for every known postal so the
  // shape is predictable downstream even for fully-empty states.
  const byState = {};
  for (const postal of columns) {
    const entry = BY_POSTAL[postal];
    if (!entry) continue; // unknown column — skip defensively
    byState[entry.name] = {};
  }

  const years = new Set();

  for (const row of rows) {
    if (row['School Year'] === PARTIAL_YEAR_ROW) continue;
    const startYear = parseSchoolYear(row['School Year']);
    if (startYear == null) continue;
    years.add(startYear);

    for (const postal of columns) {
      const entry = BY_POSTAL[postal];
      if (!entry) continue;
      byState[entry.name][startYear] = normalizeCell(row[postal]);
    }
  }

  return {
    byState,
    years: [...years].sort((a, b) => a - b),
  };
}
