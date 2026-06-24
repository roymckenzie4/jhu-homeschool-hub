/**
 * Parses the homeschool regulation CSV published by the Homeschool Hub and
 * shapes it for the State policies view.
 *
 * Input shape (as published — one row per jurisdiction):
 *   State, Only 1 HS Option, Parent Notice, ..., Total # of Regulations, Regulation Level
 *   AL,    NO,               YES,           ..., 4,                       Medium
 *
 * The first column is a postal abbreviation (AL, AK, ...), unlike the wide
 * enrollment CSV whose columns are postals. We map postal → full state name via
 * BY_POSTAL so downstream keys match the rest of the app (and the enrollment
 * `byState`).
 *
 * Output:
 *   byState: {
 *     "Alabama": {
 *       total: 4,                       // count of YES across the 10 regulations
 *       level: "Medium",                // derived from total (not the stored column)
 *       regulations: {
 *         "Only 1 HS Option": { value: false, source: <url> },
 *         "Parent Notice":    { value: true,  source: <url> },
 *         ...
 *       },
 *     },
 *     ...
 *   }
 *
 * `total` and `level` are DERIVED from the booleans here rather than read from
 * the CSV's "Total # of Regulations" / "Regulation Level" columns — consistent
 * with the app convention (rank/level are computed, not stored). The stored
 * columns are left untouched in the CSV as a cross-check.
 */

import { csvParse } from "d3-dsv";
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

export function parsePolicyCsv(csvText) {
  const rows = csvParse(csvText);
  const byState = {};

  for (const row of rows) {
    const postal = String(row.State ?? "").trim();
    const entry = BY_POSTAL[postal];
    if (!entry) continue; // unknown row — skip defensively

    const regulations = {};
    let total = 0;
    for (const key of REGULATION_KEYS) {
      const value = isYes(row[key]);
      if (value) total += 1;
      // Every cell gets a source link — a placeholder for now (see policy.js).
      regulations[key] = { value, source: PLACEHOLDER_SOURCE_URL };
    }

    byState[entry.name] = {
      total,
      level: regulationLevel(total),
      regulations,
    };
  }

  return { byState };
}
