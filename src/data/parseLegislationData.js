/**
 * Parses the Homeschool Hub "Legislation" tab (Google Sheets values.get) into
 * per-state compulsory-schooling + legalization facts, keyed by full state name.
 *
 * Unlike the "Heat Map" tab, these cells carry no source hyperlinks — plain
 * values — so the simpler values.get is used (a 2-D array of formatted strings)
 * rather than the full cell model parseSheetsData reads. Header-driven: maps
 * each configured column's header string to its index, so a column reorder or
 * added columns on the tab don't break the read.
 *
 * Expected input (values.get response):
 *   { values: [ ["State","Region","Comp min age",...], ["AL","S","6",...], ... ] }
 *   row 0 is the header; col 0 ("State") is a postal abbreviation (AL, AK, ...),
 *   mapped to full state name via BY_POSTAL to match the rest of the app.
 *
 * Output:
 *   byState: { "Alabama": { compMinAge: 6, compMaxAge: 17, yearsRequired: 11,
 *                           legalized: 1982 } }
 *
 * Values coerce to numbers; a blank or non-numeric cell yields null so the card
 * can render an em dash rather than "NaN".
 */

import { BY_POSTAL } from "../config/states.js";
import { LEGISLATION_COLUMNS } from "../config/policy.js";

/** Trimmed cell text as a number, or null for a blank/non-numeric cell. */
function toNumber(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function parseLegislationData(json) {
  const rows = json?.values ?? [];
  if (rows.length < 2) {
    throw new Error("Legislation response has no data rows");
  }

  // Map header column name -> index. values.get omits trailing empty cells, so
  // a data row can be shorter than the header; index lookups guard for that.
  const header = rows[0].map((c) => String(c ?? "").trim());
  const columnIndex = {};
  header.forEach((name, i) => {
    if (name) columnIndex[name] = i;
  });

  const stateCol = columnIndex["State"] ?? 0;
  const byState = {};

  for (const row of rows.slice(1)) {
    const postal = String(row[stateCol] ?? "").trim();
    const entry = BY_POSTAL[postal];
    if (!entry) continue; // region separator / footnote row — skip defensively

    const facts = {};
    for (const [field, headerName] of Object.entries(LEGISLATION_COLUMNS)) {
      facts[field] = toNumber(row[columnIndex[headerName]]);
    }
    byState[entry.name] = facts;
  }

  return { byState };
}
