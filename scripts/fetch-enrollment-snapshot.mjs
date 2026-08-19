/**
 * Fetches the Homeschool Hub enrollment workbook and writes a bundled snapshot
 * (src/data/enrollment-snapshot.json) the app imports synchronously — the live
 * counterpart to the CSV fallback, refreshed in CI so the tool shows JHU's
 * current sheet without a runtime Google dependency.
 *
 * The enrollment source is an uploaded .xlsx in Drive, not a native Google
 * Sheet, so the Sheets API refuses it (FAILED_PRECONDITION). Instead the whole
 * file is downloaded via the Drive API (files.get?alt=media) and its "All
 * States" tab is read with SheetJS — a build-only dependency that never reaches
 * the browser bundle. That tab is the same wide format as the bundled CSV
 * (row 0 = school years down column A... postal codes across), so the shared
 * shapeEnrollmentGrid does the pivot; no enrollment-specific parser is duplicated.
 *
 * Run locally (loads SHEETS_API_KEY from .env.local):
 *   node --env-file=.env.local scripts/fetch-enrollment-snapshot.mjs
 *
 * In CI the key comes from a repo secret (see the deploy workflow). On any
 * failure the script exits non-zero WITHOUT writing, so a transient outage or a
 * truncated fetch leaves the last known-good snapshot in place.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as XLSX from "xlsx";
import { shapeEnrollmentGrid, parseCsv } from "../src/data/parseCsv.js";
import { fetchDriveFile, requireKey, writeSnapshot } from "./lib/sheets.mjs";

// Drive file id of the enrollment workbook (an uploaded .xlsx) + the tab that
// holds the wide all-states table.
const DRIVE_FILE_ID = "1xFaTmfL1W-rkgrT_M39aApH2SVTjpnte";
const TAB = "All States";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(HERE, "../src/data/enrollment-snapshot.json");
const CSV_PATH = resolve(HERE, "../homeschool-hub-state-summary-data.csv");

// Shape guard: the snapshot must cover at least as many states and years as the
// bundled CSV. Expansion (more states / more years) passes — this only trips on
// a truncated or mangled fetch, refusing to overwrite the good snapshot with a
// smaller dataset. The CSV is the always-present floor, so it self-adjusts if
// the bundled fallback is ever refreshed.
function assertNotSmallerThanCsv(byState, years) {
  const csv = parseCsv(readFileSync(CSV_PATH, "utf8"));
  const floorStates = Object.keys(csv.byState).length;
  const floorYears = csv.years.length;
  const gotStates = Object.keys(byState).length;
  const gotYears = years.length;
  if (gotStates < floorStates || gotYears < floorYears) {
    throw new Error(
      `enrollment: parsed ${gotStates} states / ${gotYears} years, below CSV floor ` +
        `${floorStates}/${floorYears} — refusing to overwrite snapshot`,
    );
  }
}

async function main() {
  const key = requireKey();

  // Download the whole .xlsx, then read just the all-states tab as a 2-D grid.
  const buf = await fetchDriveFile(DRIVE_FILE_ID, key);
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheet = workbook.Sheets[TAB];
  if (!sheet) {
    throw new Error(
      `enrollment: tab "${TAB}" not found; tabs: ${workbook.SheetNames.join(", ")}`,
    );
  }
  // header:1 → array-of-arrays (same shape as Sheets values.get); blankrows:false
  // drops fully empty spacer rows.
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  const { byState, years } = shapeEnrollmentGrid(rows);
  assertNotSmallerThanCsv(byState, years);

  writeSnapshot(OUT_PATH, { byState, years });
  console.log(
    `Wrote ${OUT_PATH}\n  ${Object.keys(byState).length} reporting states, ` +
      `${years.length} years (${years[0]}–${years[years.length - 1]})`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
