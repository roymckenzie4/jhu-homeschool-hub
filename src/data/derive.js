/**
 * Derives year-level aggregates from the `byState` shape produced by parseCsv.
 *
 * For each year present in the data, computes:
 *   - total:          sum of all reporting (non-null) state values that year
 *   - reportingCount: number of jurisdictions with a non-null value that year
 *                     (DC is counted; the denominator in the UI is 51)
 *   - rankByState:    { stateName: 1-based rank } — higher value = lower rank #
 *                     (rank 1 = largest reported enrollment that year)
 *
 * National rank for a state is intentionally NOT precomputed onto byState —
 * it's read out of byYear[year].rankByState at consumption time.
 */

import { BY_NAME } from '../config/states.js';

export function deriveByYear(byState) {
  const yearsSet = new Set();
  for (const name of Object.keys(byState)) {
    for (const y of Object.keys(byState[name])) yearsSet.add(Number(y));
  }
  const years = [...yearsSet].sort((a, b) => a - b);

  const byYear = {};

  for (const year of years) {
    let total = 0;
    let reportingCount = 0;

    // Collect [name, value] pairs for ranking — only reporting states.
    const reporting = [];

    for (const name of Object.keys(byState)) {
      const v = byState[name][year];
      if (v == null) continue;
      total += v;
      reporting.push([name, v]);
      // Count every known jurisdiction (50 states + DC) toward the reporting tally.
      if (BY_NAME[name]) reportingCount += 1;
    }

    reporting.sort((a, b) => b[1] - a[1]);
    const rankByState = {};
    reporting.forEach(([name], i) => {
      rankByState[name] = i + 1;
    });

    byYear[year] = { total, reportingCount, rankByState };
  }

  return byYear;
}
