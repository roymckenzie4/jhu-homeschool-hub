/**
 * Audits every pipeline-built State Explorer state's region-sum (the sum of
 * its displayed regions' values, for its own default year) against its true
 * verified total (the sum of ALL raw rows for that state/year, matched or
 * not — see shapeState's yearTotals). A gap is expected and legitimate when
 * it's explained by rows with no name to attach a region to (e.g. an
 * "undisclosed county" bucket) — the existing "floor, not ceiling" pattern.
 * A gap is a real bug candidate when it's explained by rows that DO have a
 * name but failed to match the state's boundary-file geometry (a typo, a
 * missing TYPO_FIXES entry, a truncation not yet handled) — exactly the
 * class of bug the Washington overwrite-vs-sum issue turned out to be.
 *
 * Reuses the real build pipeline's own shapeState/MAP_MATCHED/LIST_ONLY
 * (exported from build-state-explorer-snapshot.mjs for this purpose) rather
 * than re-deriving matching logic, so this can't silently drift from how the
 * live snapshot is actually built.
 *
 * Run locally:
 *   node scripts/audit-state-explorer-totals.mjs
 */

import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  SOURCE_PATH,
  MAP_MATCHED,
  LIST_ONLY,
  NAME_BY_POSTAL,
  shapeState,
  geoNames,
} from "./build-state-explorer-snapshot.mjs";

const wb = XLSX.read(readFileSync(SOURCE_PATH), { type: "buffer" });
const allRows = XLSX.utils.sheet_to_json(wb.Sheets["raw data"], { defval: null, range: 1 });

function auditState(code, cfg, mapMatched) {
  const rows = allRows.filter((r) => r.lstate === code);
  const validNames = mapMatched ? geoNames(cfg.geoPath) : null;
  const countField = cfg.countField ?? "total_enrollment_ count";
  const shaped = shapeState({
    rows,
    nameField: cfg.nameField,
    mapName: mapMatched ? cfg.mapName : null,
    validNames,
    pinnedYear: cfg.pinnedYear,
    countField,
  });

  // shapeState's own latest-year selection, re-derived from its label (the
  // label's leading 4 digits are always the raw fall year — see yearLabel).
  const latestYear = parseInt(shaped.year, 10);
  const yearRows = rows.filter((r) => r.sy_fall === latestYear);

  const regionSum = shaped.regions.reduce((sum, r) => sum + (r.values[shaped.year] ?? 0), 0);

  let unnamedSum = 0;
  let unmatchedNamedSum = 0;
  const unmatchedNames = new Map(); // raw name -> summed total, for the printed sample

  for (const row of yearRows) {
    const total = row[countField];
    if (typeof total !== "number") continue;
    const raw = row[cfg.nameField];
    if (!raw || !raw.trim()) {
      unnamedSum += total;
      continue;
    }
    const name = mapMatched ? cfg.mapName(raw.trim()) : raw.trim();
    const matched = mapMatched ? validNames.has(name) : true;
    if (!matched) {
      unmatchedNamedSum += total;
      unmatchedNames.set(raw.trim(), (unmatchedNames.get(raw.trim()) ?? 0) + total);
    }
  }

  const gap = shaped.total - regionSum;
  return {
    code,
    name: NAME_BY_POSTAL[code],
    year: shaped.year,
    total: shaped.total,
    regionSum,
    gap,
    gapPct: shaped.total ? (gap / shaped.total) * 100 : 0,
    unnamedSum,
    unmatchedNamedSum,
    unmatchedNames: [...unmatchedNames.entries()].sort((a, b) => b[1] - a[1]),
  };
}

const results = [
  ...Object.entries(MAP_MATCHED).map(([code, cfg]) => auditState(code, cfg, true)),
  ...Object.entries(LIST_ONLY).map(([code, cfg]) => auditState(code, cfg, false)),
].sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));

console.log(
  "code  state                 year       total  regionSum     gap   gap%   unnamed  unmatched-named",
);
for (const r of results) {
  console.log(
    `${r.code.padEnd(5)} ${r.name.padEnd(21)} ${r.year.padEnd(10)} ${String(r.total).padStart(6)} ` +
      `${String(r.regionSum).padStart(10)} ${String(r.gap).padStart(7)} ${r.gapPct.toFixed(2).padStart(6)}% ` +
      `${String(r.unnamedSum).padStart(8)} ${String(r.unmatchedNamedSum).padStart(15)}`,
  );
}

console.log("\nFlagged — named row(s) failed to match the boundary geometry (real bug candidates):");
const flagged = results.filter((r) => r.unmatchedNamedSum > 0);
if (flagged.length === 0) {
  console.log("  none — every gap is fully explained by unnamed rows.");
}
for (const r of flagged) {
  console.log(`  ${r.code} (${r.name}): ${r.unmatchedNamedSum} across unmatched name(s):`);
  for (const [name, sum] of r.unmatchedNames.slice(0, 8)) {
    console.log(`    "${name}" — ${sum}`);
  }
}
