/**
 * Enrollment data loader — the single seam between the app and the enrollment
 * dataset (mirrors policyLoader.js). Parses the published wide-format CSV once
 * at module load and exposes the shaped result plus the raw text (for the CSV
 * download affordance).
 *
 * The State policies view reads `latestReportedEnrollment` for its
 * "Homeschoolers" column; the Enrollment view consumes `enrollmentByState` /
 * `enrollmentYears` for everything it renders.
 */

import csvText from "../../homeschool-hub-state-summary-data.csv?raw";
import { parseCsv } from "./parseCsv.js";

// Raw CSV text, exposed for the "Download data (CSV)" affordance.
export const enrollmentCsvText = csvText;

// Shaped enrollment data, parsed once. Keyed by full state name.
export const { byState: enrollmentByState, years: enrollmentYears } =
  parseCsv(csvText);

// The most recent complete school year in the dataset (start-year integer).
export const enrollmentLatestYear = enrollmentYears[enrollmentYears.length - 1];

/**
 * A state's enrollment in the latest dataset year, or null if it didn't report
 * that year. The policy view's Homeschoolers column reads a single shared year
 * across all states so its header can name a concrete year honestly; states
 * with no value for that year render as "not reported".
 */
export function enrollmentInLatestYear(name) {
  return enrollmentByState[name]?.[enrollmentLatestYear] ?? null;
}
