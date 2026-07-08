/**
 * Regulation (policy) topic — descriptor and footer content for the unified
 * shell.
 *
 * Mirrors enrollmentTopic, but the descriptor is a static CONSTANT: regulation
 * levels don't change with a year, so there's nothing to rebuild. The shell
 * feeds this descriptor to the shared map + legend + chip row exactly as it
 * feeds enrollment's. The comparison table lives in PolicyPanel.
 */

import { policyByState, policyCsvText } from "../data/policyLoader.js";
import {
  LEVELS,
  LEVEL_ORDER,
  REGULATION_COUNT,
  POLICY_DOWNLOAD_FILENAME,
} from "../config/policy.js";
import { COLORS, levelColor } from "../config/theme.js";

// Legend swatches: one per level, colored + labeled with its count range.
const LEGEND_SWATCHES = LEVEL_ORDER.map((level) => ({
  color: levelColor(level),
  label: `${LEVELS[level].label} ${LEVELS[level].range}`,
}));

export const policyDescriptor = {
  fillForState: (name) => levelColor(policyByState[name]?.level),
  ariaLabelForState: (name) => {
    const entry = policyByState[name];
    return entry
      ? `${name}, ${entry.level} regulation, ${entry.total} of ${REGULATION_COUNT} in force`
      : name;
  },
  selectionStroke: COLORS.heritage,
  legend: {
    label: "Regulation level, Count in force",
    swatches: LEGEND_SWATCHES,
    trailing: (
      <span className="whitespace-nowrap text-sable/55">
        Click states to compare · {REGULATION_COUNT} tracked regulations
      </span>
    ),
  },
  dotColorForState: (name) => levelColor(policyByState[name]?.level),
  metaForState: (name) =>
    `${policyByState[name]?.total ?? 0}/${REGULATION_COUNT}`,
};

// Live level distribution across all jurisdictions, computed once — keeps the
// "About this data" counts honest against the dataset (never hard-coded).
const LEVEL_DISTRIBUTION = Object.values(policyByState).reduce(
  (dist, entry) => {
    dist[entry.level] += 1;
    return dist;
  },
  { Low: 0, Medium: 0, High: 0 },
);

// Footer content for the shared footer (placeholder copy; JHU owns final copy).
export const policyFooter = {
  about: (
    <>
      Each state is scored across {REGULATION_COUNT} homeschool regulations
      grouped into registration, instruction, and assessment requirements. A
      state's regulation level reflects how many are in force — Low (0–3), Medium
      (4–6), or High (7–10) — currently {LEVEL_DISTRIBUTION.Low} Low,{" "}
      {LEVEL_DISTRIBUTION.Medium} Medium, and {LEVEL_DISTRIBUTION.High} High. The
      Homeschoolers column draws on the enrollment dataset and shows each state's
      figure for the latest year, or “not reported” where the state does not
      publish one. Figures are illustrative placeholders pending the verified
      dataset.
    </>
  ),
  csvText: policyCsvText,
  downloadFilename: POLICY_DOWNLOAD_FILENAME,
};
