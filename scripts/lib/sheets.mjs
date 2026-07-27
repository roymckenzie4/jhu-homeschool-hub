/**
 * Shared Google Sheets / Drive fetch plumbing for the build-time snapshot
 * scripts (fetch-policy-snapshot, fetch-enrollment-snapshot). One place for the
 * transport concerns both topics share — the referrer-restricted key, the
 * three access shapes, and the snapshot writer — so each topic script is just
 * its own IDs, parsers, and shape guard, not a copy of this plumbing.
 *
 * Three ways in, by what the source needs:
 *   - fetchGrid    — spreadsheets.get, the full cell model (per-cell hyperlinks).
 *   - fetchValues  — values.get, a plain 2-D array of formatted strings.
 *   - fetchDriveFile — Drive files.get?alt=media, raw bytes for a Drive file the
 *                      Sheets API refuses (an uploaded .xlsx isn't a native Sheet).
 *
 * All requests carry the referrer the key is restricted to, and throw on any
 * non-OK response so a failed fetch aborts the run before anything is written —
 * the committed snapshot stays as the last known-good copy.
 */

import { writeFileSync } from "node:fs";

// The key is HTTP-referrer restricted; send a matching Referer so the request is
// accepted from a server (local or CI) where there's no browser origin.
const REFERER = "https://roymckenzie4.github.io/";

// GET with the key + referrer; throws on any non-OK response.
async function apiFetch(url, key) {
  url.searchParams.set("key", key);
  const res = await fetch(url, { headers: { Referer: REFERER } });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res;
}

// spreadsheets.get — full cell model for tabs whose per-cell hyperlinks matter.
export async function fetchGrid(spreadsheetId, ranges, fields, key) {
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
  );
  url.searchParams.set("ranges", ranges);
  url.searchParams.set("fields", fields);
  return (await apiFetch(url, key)).json();
}

// values.get — plain 2-D array of formatted strings for a values-only tab.
export async function fetchValues(spreadsheetId, range, key) {
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range,
    )}`,
  );
  return (await apiFetch(url, key)).json();
}

// Drive files.get?alt=media — raw file bytes, for a Drive file that is NOT a
// native Google Sheet (e.g. an uploaded .xlsx the Sheets API won't read). Needs
// the Drive API enabled on the key's project.
export async function fetchDriveFile(fileId, key) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
  url.searchParams.set("alt", "media");
  const res = await apiFetch(url, key);
  return Buffer.from(await res.arrayBuffer());
}

// SHEETS_API_KEY or a clear failure — every script needs it.
export function requireKey() {
  const key = process.env.SHEETS_API_KEY;
  if (!key) {
    throw new Error("SHEETS_API_KEY is not set");
  }
  return key;
}

// Write a snapshot JSON with a generation timestamp. `data` carries the shaped
// payload (e.g. { byState } or { byState, years }).
export function writeSnapshot(outPath, data) {
  const snapshot = { generatedAt: new Date().toISOString(), ...data };
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
}
