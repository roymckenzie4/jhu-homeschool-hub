/**
 * Parses the Homeschool Hub "Heat Map" tab as returned by the Google Sheets API
 * (`spreadsheets.get`) and shapes it identically to parsePolicyCsv, so the two
 * are interchangeable behind policyLoader.
 *
 * The reason this path exists at all: CSV export strips hyperlinks, but the
 * regulation cells carry a per-cell source statute link. The Sheets API returns
 * the full cell model, so each cell yields both its value AND its link. On this
 * sheet the links are WHOLE-CELL (`CellData.hyperlink`), not rich-text runs — so
 * one field, `hyperlink`, carries every source.
 *
 * Expected API response (fields mask keeps it to cells + links):
 *   sheets[0].data[0].rowData[] -> { values: [ { formattedValue, hyperlink } ] }
 *   row 0 is the header; row 0 col 0 is "State", the rest are column names that
 *   match REGULATION_KEYS (plus the derived Total / Level columns we ignore).
 *
 * Output matches parsePolicyCsv exactly:
 *   byState: { "Alabama": { total, level, regulations: { key: { value, source } } } }
 *
 * Header-driven (maps column name -> index) rather than assuming fixed
 * positions, so the sheet's wider grid and any future column reorder don't
 * break the read. Cells with no link fall back to the placeholder, matching the
 * CSV path — links are genuinely sparse in spots.
 */

import { BY_POSTAL } from "../config/states.js";
import {
  REGULATION_KEYS,
  regulationLevel,
  PLACEHOLDER_SOURCE_URL,
} from "../config/policy.js";

/** A cell counts as "in force" only when it reads exactly YES (case-insensitive). */
function isYes(raw) {
  return String(raw ?? "").trim().toUpperCase() === "YES";
}

/** Trimmed cell text, or "" for an empty/absent cell. */
function cellText(cell) {
  return String(cell?.formattedValue ?? "").trim();
}

export function parseSheetsData(json) {
  const rowData = json?.sheets?.[0]?.data?.[0]?.rowData ?? [];
  if (rowData.length < 2) {
    throw new Error("Sheets response has no data rows");
  }

  // Map header column name -> index. The API omits trailing empty cells, so a
  // row's `values` can be shorter than the header; index lookups guard for that.
  const header = (rowData[0].values ?? []).map((c) => cellText(c));
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
    if (!entry) continue; // unknown/footnote row — skip defensively

    const regulations = {};
    let total = 0;
    for (const key of REGULATION_KEYS) {
      const cell = cells[columnIndex[key]];
      const value = isYes(cell?.formattedValue);
      if (value) total += 1;
      // Real per-cell source link; placeholder where the sheet has none.
      regulations[key] = { value, source: cell?.hyperlink || PLACEHOLDER_SOURCE_URL };
    }

    byState[entry.name] = {
      total,
      level: regulationLevel(total),
      regulations,
    };
  }

  return { byState };
}
