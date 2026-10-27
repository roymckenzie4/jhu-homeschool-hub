/**
 * Fetches JHU's expanded disaggregated raw-data workbook ("Combined State
 * Data") from Drive and rebuilds src/data/state-explorer-snapshot.json —
 * the live counterpart to build-state-explorer-snapshot.mjs's local manual
 * drop (notes/, outside the repo, updated by hand whenever JHU sends a new
 * file). Same shape as fetch-enrollment-snapshot.mjs: the source is an
 * uploaded .xlsx in Drive, not a native Sheet, so it's pulled whole via the
 * Drive API (files.get?alt=media) and read with SheetJS. Reuses
 * build-state-explorer-snapshot.mjs's own readRawRows/buildStates so this
 * can't drift from how the local manual build works — only the byte source
 * differs.
 *
 * DRIVE_FILE_ID below is a personal copy Roy made and link-shared, standing
 * in until Genny turns on "anyone with the link" sharing on the real
 * Combined State Data file (she's shared it to specific accounts only so
 * far, which a bare API key can't read — see decisions.md, 2026-10-27).
 * Swap it for the real file's id once she confirms.
 *
 * Run locally (loads SHEETS_API_KEY from .env.local):
 *   node --env-file=.env.local scripts/fetch-state-explorer-snapshot.mjs
 *
 * In CI the key comes from a repo secret. On any failure the script exits
 * non-zero WITHOUT writing, so a transient outage or a truncated fetch
 * leaves the last known-good snapshot in place.
 */

import { fetchDriveFile, requireKey, writeSnapshot } from "./lib/sheets.mjs";
import { readRawRows, buildStates, OUT_PATH } from "./build-state-explorer-snapshot.mjs";

// TODO: swap for the real Combined State Data file's id once Genny turns on
// link sharing (ask sent 2026-10-27 — see decisions.md).
const DRIVE_FILE_ID = "1fTIYkuxheZWqNj6jh8Wg7YM9bGnBomvj";

async function main() {
  const key = requireKey();
  const buf = await fetchDriveFile(DRIVE_FILE_ID, key);
  const rows = readRawRows(buf);
  const states = buildStates(rows);

  writeSnapshot(OUT_PATH, { source: `drive:${DRIVE_FILE_ID}`, states });

  console.log(`wrote ${OUT_PATH}`);
  for (const [code, state] of Object.entries(states)) {
    const demoKeys = Object.keys(state.demographics).join(",") || "none";
    console.log(
      `${code}: ${state.regions.length} regions, through ${state.year}, ` +
        `total ${state.total}, demographics: ${demoKeys}`,
    );
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
