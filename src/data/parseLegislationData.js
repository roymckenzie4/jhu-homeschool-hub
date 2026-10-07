/**
 * Parses the Homeschool Hub "Legislation" tab as returned by the Google
 * Sheets API (`spreadsheets.get`), into per-state compulsory-schooling +
 * legalization facts AND access/funding "State context" facts, keyed by
 * full state name.
 *
 * Reads the full cell model (not values.get) because the access/funding
 * columns (ACCESS_COLUMNS) carry real per-cell source hyperlinks — same
 * whole-cell `hyperlink` field as the Heat Map tab, not rich-text runs.
 * The compulsory-schooling columns (LEGISLATION_COLUMNS) have no links; they
 * just ride along on the same read since both live on one tab.
 *
 * Expected input (spreadsheets.get response, fields mask kept to cells+links):
 *   sheets[0].data[0].rowData[] -> { values: [ { formattedValue, hyperlink } ] }
 *   row 0 is the header; col 0 ("State") is a postal abbreviation (AL, AK, ...),
 *   mapped to full state name via BY_POSTAL. Header-driven (maps column name
 *   -> index) so a column reorder or added columns don't break the read.
 *
 * Output:
 *   byState: { "Alabama": {
 *     legislation: { compMinAge, compMaxAge, yearsRequired, legalized },
 *     context: { sportsAccess: { value, url? }, courseAccess: {...}, ... },
 *   } }
 *
 * Legislation values coerce to numbers; a blank/non-numeric cell yields null.
 * Context fields are skipped (not written) if the cell is blank — a state
 * with none of the four access facts yet gets no `context` key, same as the
 * existing "no context" fallback.
 */

import { BY_POSTAL } from "../config/states.js";
import { LEGISLATION_COLUMNS, ACCESS_COLUMNS } from "../config/regulation.js";

/** Trimmed cell text, or "" for an empty/absent cell. */
function cellText(cell) {
  return String(cell?.formattedValue ?? "").trim();
}

/** Cell text as a number, or null for a blank/non-numeric cell. */
function toNumber(cell) {
  const text = cellText(cell);
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Sheet stores YES/NO/MAYBE; display convention elsewhere is Title Case. */
function titleCase(cell) {
  const text = cellText(cell);
  if (!text) return null;
  return text[0].toUpperCase() + text.slice(1).toLowerCase();
}

export function parseLegislationData(json) {
  const rowData = json?.sheets?.[0]?.data?.[0]?.rowData ?? [];
  if (rowData.length < 2) {
    throw new Error("Legislation response has no data rows");
  }

  // Map header column name -> index. The API omits trailing empty cells, so a
  // row's `values` can be shorter than the header; index lookups guard for that.
  const header = (rowData[0].values ?? []).map(cellText);
  const columnIndex = {};
  header.forEach((name, i) => {
    if (name) columnIndex[name] = i;
  });

  const stateCol = columnIndex["State"] ?? 0;
  const byState = {};

  for (const row of rowData.slice(1)) {
    const cells = row.values ?? [];
    const postal = cellText(cells[stateCol]);
    const entry = BY_POSTAL[postal];
    if (!entry) continue; // region separator / footnote row — skip defensively

    const legislation = {};
    for (const [field, headerName] of Object.entries(LEGISLATION_COLUMNS)) {
      legislation[field] = toNumber(cells[columnIndex[headerName]]);
    }

    const context = {};
    for (const [field, headerName] of Object.entries(ACCESS_COLUMNS)) {
      const cell = cells[columnIndex[headerName]];
      const value = titleCase(cell);
      if (!value) continue;
      context[field] = cell.hyperlink ? { value, url: cell.hyperlink } : { value };
    }

    byState[entry.name] = { legislation, context };
  }

  return { byState };
}
