/**
 * Parses the wide-format school enrollment data published by the Homeschool Hub
 * and pivots it into shapes the UI can consume directly.
 *
 * Two entry points share one shaping core (shapeEnrollmentGrid):
 *   - parseCsv(text)          — the bundled CSV fallback (d3 splits the text).
 *   - shapeEnrollmentGrid(rows) — the live path: a 2-D grid of rows, matching
 *                                 the Google Sheets values shape and the xlsx
 *                                 workbook rows the snapshot script reads. Kept
 *                                 pure (no xlsx here) so the app can import it
 *                                 without pulling a build-only parser into the
 *                                 bundle.
 *
 * Input shape (either path):
 *   ["School Year", "AR", "CA", "CO", ...]   <- row 0, header (postal codes)
 *   ["1999-2000",   11038,  null, 9719, ...] <- one row per school year
 *
 * Output:
 *   byState: { "Arkansas": { 2024: 35419, 2023: 27528, ... }, ... }
 *   years:   [1999, 2000, ... 2024] (sorted ascending, integers — start year)
 *
 * Normalization rules (per PLAN.md):
 *   - "35,419" / 35419 → 35419   (strip thousands separators; numbers pass through)
 *   - "" / "  " / blank → null     (preserves "not reporting" — never coerced to 0)
 *   - "2024-2025" → start year 2024 (internal int key; display label at render)
 *   - The in-flight "2025-2026" row is dropped for this prototype (partial data).
 */

import { csvParseRows } from "d3-dsv";
import { BY_POSTAL } from "../config/states.js";

// In-flight school year that the published data only partially covers.
// Dropping this is intentional.
const PARTIAL_YEAR_ROW = "2025-2026";

/** Strip thousands separators and parse to a number, or null for a blank cell.
 *  Handles both CSV strings ("11,038") and already-numeric cells (xlsx). */
function normalizeCell(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === "") return null;
  const stripped = trimmed.replace(/,/g, "");
  const n = Number(stripped);
  return Number.isFinite(n) ? n : null;
}

/** "2024-2025" → 2024. Returns null if the label doesn't look like a school year. */
function parseSchoolYear(label) {
  const match = String(label)
    .trim()
    .match(/^(\d{4})-\d{4}$/);
  return match ? Number(match[1]) : null;
}

/**
 * Shape a 2-D enrollment grid into { byState, years }.
 * - Row 0 is the header: "School Year" then a postal code per column.
 * - Each following row is a school year label then one value per state column,
 *   positionally aligned to the header (short rows read as null past their end).
 * - byState is keyed by full state name (matches BY_NAME in config/states.js);
 *   only states present as columns get an entry, so a non-reporting state stays
 *   absent rather than a row of nulls.
 */
export function shapeEnrollmentGrid(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error("enrollment grid has no data rows");
  }

  // Column postals in order (drop the leading "School Year" header cell).
  const columns = rows[0].slice(1).map((c) => String(c ?? "").trim());

  // One empty bucket per known column, so the shape is predictable downstream.
  const byState = {};
  for (const postal of columns) {
    const entry = BY_POSTAL[postal];
    if (entry) byState[entry.name] = {};
  }

  const years = new Set();

  for (const row of rows.slice(1)) {
    const label = String(row[0] ?? "").trim();
    if (label === PARTIAL_YEAR_ROW) continue;
    const startYear = parseSchoolYear(label);
    if (startYear == null) continue;
    years.add(startYear);

    columns.forEach((postal, i) => {
      const entry = BY_POSTAL[postal];
      if (!entry) return; // unknown column — skip defensively
      byState[entry.name][startYear] = normalizeCell(row[i + 1]);
    });
  }

  return {
    byState,
    years: [...years].sort((a, b) => a - b),
  };
}

/** Parse the bundled wide CSV string into { byState, years }. */
export function parseCsv(csvText) {
  return shapeEnrollmentGrid(csvParseRows(csvText));
}
