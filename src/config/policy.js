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
      {
        key: "Only 1 HS Option",
        label: "Only one option",
        definition:
          '"YES" indicates that there is only one option for homeschool students in the state. "NO" indicates that there are multiple different options that parents/guardians can choose to allow their children to school from home.',
      },
      {
        key: "Parent Notice",
        label: "Parent notice",
        definition:
          '"YES" indicates that the state requires parents/guardians to notify or request approval prior to homeschooling their children. "NO" indicates that there is no requirement to notify the state.',
      },
      {
        key: "State Collects Data",
        label: "State collects data",
        definition:
          '"YES" indicates that the state collects data on homeschool students and families. "NO" indicates that the state does not collect data on homeschool students and families.',
      },
    ],
  },
  {
    id: "instruction",
    label: "Instruction",
    regulations: [
      {
        key: "Min Educator Reqs",
        label: "Educator requirements",
        definition:
          '"YES" indicates that the state has minimum education or certification requirements for educators of homeschool students. "NO" indicates that the state has no minimum requirements for homeschool educators. This section was marked as "YES" even if only one of multiple homeschool options requires minimum educator requirements.',
      },
      {
        key: "Min Instruction Time",
        label: "Instruction time",
        definition:
          '"YES" indicates that the state has requirements about the minimum amount of instruction that homeschool students should receive. These requirements could be in number of days or hours of instruction. "NO" indicates that the state does not have requirements about minimum instruction time. This section was marked as "YES" even if only one of multiple homeschool options requires minimum instruction time.',
      },
      {
        key: "Required Subjects",
        label: "Required subjects",
        definition:
          '"YES" indicates that the state requires certain course subjects to be taught to homeschool students. "NO" indicates that the state does not require instruction in certain course subjects. This section was marked as "YES" even if only one of multiple homeschool options requires course subjects.',
      },
      {
        key: "Maintain Records",
        label: "Maintain records",
        definition:
          '"YES" indicates that the state requires homeschool educators to maintain certain records of their students. These records may include attendance records, immunization records, assessments, portfolios of student work, or others. "NO" indicates that the state does not require homeschool educators to maintain records. This section was marked as "YES" even if only one of multiple homeschool options requires record keeping.',
      },
    ],
  },
  {
    id: "assessment",
    label: "Assessment",
    regulations: [
      {
        key: "Assessment Required",
        label: "Assessment required",
        definition:
          '"YES" indicates that the state requires students to take assessments. "NO" indicates that the state does not have assessment requirements. This section was marked as "YES" even if only one of multiple homeschool option requires assessment. This section was also marked as "YES" even if there were alternatives to testing available, such as evaluation by a certified teacher.',
      },
      {
        key: "Annual Testing",
        label: "Annual testing",
        definition:
          '"YES" indicates that the state requires homeschool students to be assessed annually. "NO" indicates that the state does not require annual assessment. This section was marked as "YES" even if only one of multiple homeschool options requires annual testing.',
      },
      {
        key: "Required Submission",
        label: "Required submission",
        definition:
          '"YES" indicates that the state requires homeschool parents/guardians/educators to submit student assessments to the district or state. "NO" indicates that the state does not require submission of assessments. This section was marked as "YES" even if only one of multiple homeschool options requires submission.',
      },
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
 * Compulsory-schooling + legalization facts surfaced in the regulation card,
 * pulled from the sheet's "Legislation" tab. Keys are the internal field names;
 * values are the EXACT Legislation header strings (the parser reads cells by
 * these — do not rename without updating the sheet, or vice versa). These are
 * plain numbers on that tab (no source links), so they come via values.get.
 */
export const LEGISLATION_COLUMNS = {
  compMinAge: "Comp min age",
  compMaxAge: "Comp max age",
  yearsRequired: "Years required",
  legalized: "Legalized",
};

// Suggested filename when the user downloads the policy CSV from the view.
export const POLICY_DOWNLOAD_FILENAME = "homeschool-hub-state-policies-2026.csv";

/**
 * Placeholder source link for every regulation cell. The real per-cell source
 * statutes arrive later via the Google Sheets API path (CSV export strips the
 * rich-text hyperlinks); until then every cell points here so the link
 * affordance and data shape are already in place. See policyLoader.js.
 */
export const PLACEHOLDER_SOURCE_URL =
  "https://docs.google.com/spreadsheets/d/1A_FkMY7CQlIns2DP7RsTtmtiOKkyfPYSwKlzzusyrkI/edit?gid=1849991455#gid=1849991455";
