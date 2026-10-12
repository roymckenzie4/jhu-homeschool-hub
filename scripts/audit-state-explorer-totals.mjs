/**
 * Audits every pipeline-built State Explorer state's region-sum (the sum of
 * its displayed regions' values) against its true verified total (the sum
 * of ALL raw rows for that state/year, matched or not — see shapeState's
 * yearTotals) for EVERY year that state has data, not just its default/
 * latest year. A gap is expected and legitimate when it's explained by rows
 * with no name to attach a region to (e.g. an "undisclosed county" bucket)
 * — the existing "floor, not ceiling" pattern. A gap is a real bug candidate
 * when it's explained by rows that DO have a name but failed to match the
 * state's boundary-file geometry (a typo, a missing TYPO_FIXES entry, a
 * truncation not yet handled) — exactly the class of bug the Washington
 * overwrite-vs-sum issue turned out to be.
 *
 * Checking every year (not just the latest) matters on its own: both the PA
 * `lcounty` column-swap (2026-10-07) and the region-roster single-anchor-year
 * bug (2026-10-12) stayed invisible for as long as they did specifically
 * because the only audit that existed checked one year per state. A bug
 * confined to an older year, or to a year that happens not to be the anchor,
 * was structurally invisible to a latest-year-only check. See decisions.md,
 * 2026-10-12.
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
  isGrandTotalRow,
} from "./build-state-explorer-snapshot.mjs";

const wb = XLSX.read(readFileSync(SOURCE_PATH), { type: "buffer" });
const allRows = XLSX.utils.sheet_to_json(wb.Sheets["raw data"], { defval: null, range: 1 });

// One row per (state, year) — every year the state has a real total for,
// not just its default/latest year.
function auditStateAllYears(code, cfg, mapMatched) {
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
    excludeYears: cfg.excludeYears,
    excludeNames: cfg.excludeNames,
  });

  return Object.entries(shaped.totalsByYear).map(([label, total]) => {
    // Labels' leading 4 digits are always the raw fall year — see yearLabel.
    const year = parseInt(label, 10);
    const yearRows = rows.filter((r) => r.sy_fall === year);

    const regionSum = shaped.regions.reduce((sum, r) => sum + (r.values[label] ?? 0), 0);

    let unnamedSum = 0;
    let unmatchedNamedSum = 0;
    const unmatchedNames = new Map(); // raw name -> summed total, for the printed sample

    for (const row of yearRows) {
      // Skip rollup rows (e.g. a bare "Totals" row with no other geo
      // column filled in) — shapeState already prefers these for the real
      // total instead of summing named rows, so a rollup row's own name
      // failing to match a boundary isn't a real gap, just this row not
      // being a region at all. Reuses shapeState's own check so the audit
      // can't drift from what the pipeline itself treats as a rollup.
      if (isGrandTotalRow(row)) continue;
      // Same two escape hatches the real pipeline gets (see shapeState) —
      // without these the audit flags a state's own deliberate "not a real
      // region" calls (e.g. MA's Devens, WY's charter schools) and PA's
      // known-bad excluded year as if they were still open bugs.
      if (cfg.excludeYears?.has(row.sy_fall)) continue;
      const rowTotal = row[countField];
      if (typeof rowTotal !== "number") continue;
      const raw = row[cfg.nameField];
      if (!raw || !raw.trim()) {
        unnamedSum += rowTotal;
        continue;
      }
      if (cfg.excludeNames?.has(raw.trim())) continue;
      const name = mapMatched ? cfg.mapName(raw.trim()) : raw.trim();
      const matched = mapMatched ? validNames.has(name) : true;
      if (!matched) {
        unmatchedNamedSum += rowTotal;
        unmatchedNames.set(raw.trim(), (unmatchedNames.get(raw.trim()) ?? 0) + rowTotal);
      }
    }

    const gap = total - regionSum;
    return {
      code,
      name: NAME_BY_POSTAL[code],
      year: label,
      isLatest: label === shaped.year,
      total,
      regionSum,
      gap,
      gapPct: total ? (gap / total) * 100 : 0,
      unnamedSum,
      unmatchedNamedSum,
      unmatchedNames: [...unmatchedNames.entries()].sort((a, b) => b[1] - a[1]),
    };
  });
}

const allResults = [
  ...Object.entries(MAP_MATCHED).flatMap(([code, cfg]) => auditStateAllYears(code, cfg, true)),
  ...Object.entries(LIST_ONLY).flatMap(([code, cfg]) => auditStateAllYears(code, cfg, false)),
];

// Default-year summary table — same shape as before, kept for a quick glance.
const latestOnly = allResults
  .filter((r) => r.isLatest)
  .sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));

console.log(
  "code  state                 year       total  regionSum     gap   gap%   unnamed  unmatched-named",
);
for (const r of latestOnly) {
  console.log(
    `${r.code.padEnd(5)} ${r.name.padEnd(21)} ${r.year.padEnd(10)} ${String(r.total).padStart(6)} ` +
      `${String(r.regionSum).padStart(10)} ${String(r.gap).padStart(7)} ${r.gapPct.toFixed(2).padStart(6)}% ` +
      `${String(r.unnamedSum).padStart(8)} ${String(r.unmatchedNamedSum).padStart(15)}`,
  );
}

console.log(
  `\nFlagged — named row(s) failed to match the boundary geometry (real bug candidates), ` +
    `across ALL ${allResults.length} state-years audited, not just each state's default year:`,
);
const flagged = allResults
  .filter((r) => r.unmatchedNamedSum > 0)
  .sort((a, b) => a.code.localeCompare(b.code) || a.year.localeCompare(b.year));
if (flagged.length === 0) {
  console.log("  none — every gap, every year, is fully explained by unnamed rows.");
}
for (const r of flagged) {
  console.log(
    `  ${r.code} (${r.name}), ${r.year}${r.isLatest ? " [default year]" : ""}: ` +
      `${r.unmatchedNamedSum} across unmatched name(s):`,
  );
  for (const [name, sum] of r.unmatchedNames.slice(0, 8)) {
    console.log(`    "${name}" — ${sum}`);
  }
}
