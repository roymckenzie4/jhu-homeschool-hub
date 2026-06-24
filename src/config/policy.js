/**
 * Policy-domain configuration for the State policies view, in one place.
 *
 * The 10 tracked homeschool regulations, grouped into the three categories the
 * comparison table renders (Registration / Instruction / Assessment). Each
 * regulation carries:
 *   - `key`   the exact column header in homeschool-hub-policy-data.csv
 *             (the parser reads cells by this string — do not rename without
 *             updating the CSV, or vice versa).
 *   - `label` the shorter display name shown in the table column header.
 *
 * Also home to the regulation-count → level bucketing and the few magic
 * numbers the view needs (compare cap, placeholder source URL).
 */

export const REGULATION_GROUPS = [
  {
    id: "registration",
    label: "Registration",
    regulations: [
      { key: "Only 1 HS Option", label: "Only one option" },
      { key: "Parent Notice", label: "Parent notice" },
      { key: "State Collects Data", label: "State collects data" },
    ],
  },
  {
    id: "instruction",
    label: "Instruction",
    regulations: [
      { key: "Min Educator Reqs", label: "Educator requirements" },
      { key: "Min Instruction Time", label: "Instruction time" },
      { key: "Required Subjects", label: "Required subjects" },
      { key: "Maintain Records", label: "Maintain records" },
    ],
  },
  {
    id: "assessment",
    label: "Assessment",
    regulations: [
      { key: "Assessment Required", label: "Assessment required" },
      { key: "Annual Testing", label: "Annual testing" },
      { key: "Required Submission", label: "Required submission" },
    ],
  },
];

// Flat list of the 10 regulation column keys, in display order. Built once from
// the grouped structure so the two never drift.
export const REGULATION_KEYS = REGULATION_GROUPS.flatMap((g) =>
  g.regulations.map((r) => r.key),
);

// Total number of tracked regulations (10) — drives the headline copy and the
// legend's "count in force" framing.
export const REGULATION_COUNT = REGULATION_KEYS.length;

/**
 * The three regulation levels, keyed by the value `regulationLevel` returns.
 * `range` is the inclusive count range each level covers, shown in the legend.
 * Color lives in theme.js (levelColor) so all palette values stay in one file.
 */
export const LEVELS = {
  Low: { label: "Low", range: "0–3" },
  Medium: { label: "Medium", range: "4–6" },
  High: { label: "High", range: "7–10" },
};

// Display order for legend swatches and any level-keyed iteration.
export const LEVEL_ORDER = ["Low", "Medium", "High"];

/**
 * Bucket a regulation count (0–10) into its level. Derived from the count
 * rather than read from the CSV's stored "Regulation Level" column, matching
 * the project convention that ranks/levels are computed, not trusted as
 * stored (keeps a single source of truth: the booleans).
 */
export function regulationLevel(count) {
  if (count <= 3) return "Low";
  if (count <= 6) return "Medium";
  return "High";
}

// Maximum number of states that can be compared at once. Single source of
// truth — the map toggle, the chip row, and the table all read this.
export const COMPARE_CAP = 6;

/**
 * Placeholder source link for every regulation cell. The real per-cell source
 * statutes arrive later via the Google Sheets API path (CSV export strips the
 * rich-text hyperlinks); until then every cell points here so the link
 * affordance and data shape are already in place. See policyLoader.js.
 */
export const PLACEHOLDER_SOURCE_URL =
  "https://docs.google.com/spreadsheets/d/1A_FkMY7CQlIns2DP7RsTtmtiOKkyfPYSwKlzzusyrkI/edit?gid=1849991455#gid=1849991455";
