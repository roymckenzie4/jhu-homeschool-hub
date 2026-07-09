/**
 * Fetches the Homeschool Hub Google Sheet and writes a bundled snapshot
 * (src/data/policy-snapshot.json) covering the two tabs the app needs:
 *
 *   - "Heat Map"    -> the 10 regulation booleans + per-cell source hyperlinks.
 *                      Uses spreadsheets.get (the full cell model), since CSV /
 *                      values.get strip the links, which is the whole point.
 *   - "Legislation" -> compulsory-schooling + legalization facts, plain numbers.
 *                      No links on this tab, so the simpler values.get is used.
 *
 * The two tabs are merged by state into one byState map, so the app imports a
 * single snapshot synchronously — no client key, no runtime Google dependency.
 *
 * Run locally (loads SHEETS_API_KEY from .env.local):
 *   node --env-file=.env.local scripts/fetch-policy-snapshot.mjs
 *
 * In CI the key comes from a repo secret (see the deploy workflow). On any
 * failure the script exits non-zero WITHOUT writing, so a transient outage
 * leaves the last known-good snapshot in place rather than blanking the data.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseSheetsData } from "../src/data/parseSheetsData.js";
import { parseLegislationData } from "../src/data/parseLegislationData.js";

const SPREADSHEET_ID = "1A_FkMY7CQlIns2DP7RsTtmtiOKkyfPYSwKlzzusyrkI";

// Heat Map: cols A–M cover State + the 10 regulations + the derived Total/Level
// columns. Open-ended rows so added jurisdictions are picked up automatically.
const HEATMAP_RANGE = "Heat Map!A:M";
const HEATMAP_FIELDS =
  "sheets.data.rowData.values(formattedValue,hyperlink,textFormatRuns.format.link.uri)";

// Legislation: cols A–R cover State + the legislation fields; the parser reads
// only the configured columns by header, so the wide range is harmless.
const LEGISLATION_RANGE = "Legislation!A:R";

// The key is HTTP-referrer restricted; send a matching Referer so the request is
// accepted from a server (local or CI) where there's no browser origin.
const REFERER = "https://roymckenzie4.github.io/";

// Expected jurisdiction count (50 states + DC) — a mismatch on either tab means
// the sheet shape drifted, so we refuse to overwrite the good snapshot.
const EXPECTED_JURISDICTIONS = 51;

const OUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/data/policy-snapshot.json",
);

// Shared GET with the key + referrer; throws on any non-OK response so a failed
// tab aborts the whole run before anything is written.
async function fetchJson(url, key) {
  url.searchParams.set("key", key);
  const res = await fetch(url, { headers: { Referer: REFERER } });
  if (!res.ok) {
    throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Guards a parsed tab against a shape drift before it's trusted for the merge.
function assertJurisdictionCount(tab, byState) {
  const count = Object.keys(byState).length;
  if (count !== EXPECTED_JURISDICTIONS) {
    throw new Error(
      `${tab}: parsed ${count} jurisdictions, expected ${EXPECTED_JURISDICTIONS} — refusing to overwrite snapshot`,
    );
  }
}

async function main() {
  const key = process.env.SHEETS_API_KEY;
  if (!key) {
    throw new Error("SHEETS_API_KEY is not set");
  }

  // Heat Map — spreadsheets.get for the full cell model (per-cell source links).
  const heatUrl = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
  );
  heatUrl.searchParams.set("ranges", HEATMAP_RANGE);
  heatUrl.searchParams.set("fields", HEATMAP_FIELDS);
  const { byState } = parseSheetsData(await fetchJson(heatUrl, key));

  // Legislation — values.get, plain numbers (no links on this tab).
  const legUrl = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      LEGISLATION_RANGE,
    )}`,
  );
  const { byState: legByState } = parseLegislationData(await fetchJson(legUrl, key));

  assertJurisdictionCount("Heat Map", byState);
  assertJurisdictionCount("Legislation", legByState);

  // Merge the legislation facts onto each state's regulation entry.
  for (const [name, facts] of Object.entries(legByState)) {
    if (byState[name]) byState[name].legislation = facts;
  }

  const snapshot = { generatedAt: new Date().toISOString(), byState };
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + "\n");

  const links = Object.values(byState)
    .flatMap((s) => Object.values(s.regulations))
    .filter((r) => !r.source.includes("docs.google.com/spreadsheets")).length;
  console.log(
    `Wrote ${OUT_PATH}\n  ${Object.keys(byState).length} jurisdictions, ` +
      `${links} real source links, legislation facts merged`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
