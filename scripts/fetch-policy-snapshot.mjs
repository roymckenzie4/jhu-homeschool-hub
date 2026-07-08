/**
 * Fetches the Homeschool Hub "Heat Map" tab via the Google Sheets API and writes
 * a bundled snapshot (src/data/policy-snapshot.json) with per-cell source links.
 *
 * Why this exists: CSV export strips the per-cell source hyperlinks; the Sheets
 * API returns them. Rather than fetch live in the browser (which would ship the
 * API key and add runtime complexity), this runs at build time — locally or in
 * CI on a schedule/manual trigger — and bakes a fresh snapshot into the build.
 * The app imports the JSON synchronously; no client key, no runtime dependency.
 *
 * Run locally:
 *   SHEETS_API_KEY=... node scripts/fetch-policy-snapshot.mjs
 *
 * In CI the key comes from a repo secret (see the deploy workflow). On any
 * failure the script exits non-zero WITHOUT writing, so a transient outage
 * leaves the last known-good snapshot in place rather than blanking the data.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseSheetsData } from "../src/data/parseSheetsData.js";

const SPREADSHEET_ID = "1A_FkMY7CQlIns2DP7RsTtmtiOKkyfPYSwKlzzusyrkI";
// Cols A–M cover State + the 10 regulations + the derived Total/Level columns.
// Open-ended rows so added jurisdictions are picked up without editing this.
const RANGE = "Heat Map!A:M";
const FIELDS =
  "sheets.data.rowData.values(formattedValue,hyperlink,textFormatRuns.format.link.uri)";

// The key is HTTP-referrer restricted; send a matching Referer so the request is
// accepted from a server (local or CI) where there's no browser origin.
const REFERER = "https://roymckenzie4.github.io/";

// Expected jurisdiction count (50 states + DC) — a mismatch means the sheet
// shape drifted, so we refuse to overwrite the good snapshot.
const EXPECTED_JURISDICTIONS = 51;

const OUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/data/policy-snapshot.json",
);

async function main() {
  const key = process.env.SHEETS_API_KEY;
  if (!key) {
    throw new Error("SHEETS_API_KEY is not set");
  }

  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
  );
  url.searchParams.set("ranges", RANGE);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("key", key);

  const res = await fetch(url, { headers: { Referer: REFERER } });
  if (!res.ok) {
    throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  }

  const { byState } = parseSheetsData(await res.json());

  const count = Object.keys(byState).length;
  if (count !== EXPECTED_JURISDICTIONS) {
    throw new Error(
      `Parsed ${count} jurisdictions, expected ${EXPECTED_JURISDICTIONS} — refusing to overwrite snapshot`,
    );
  }

  const snapshot = { generatedAt: new Date().toISOString(), byState };
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + "\n");

  const links = Object.values(byState)
    .flatMap((s) => Object.values(s.regulations))
    .filter((r) => !r.source.includes("docs.google.com/spreadsheets")).length;
  console.log(
    `Wrote ${OUT_PATH}\n  ${count} jurisdictions, ${links} real source links`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
