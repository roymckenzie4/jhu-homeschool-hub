/**
 * Contrast audit for every `text-sable/NN` (opacity-modified) span in the
 * component tree, plus a handful of solid-color badge/pill pairings worth
 * re-confirming alongside the muted-text sweep. Flags anything under WCAG
 * AA's 4.5:1 normal-text threshold (nothing in this app's muted text is
 * large/bold enough to qualify for the 3:1 large-text threshold — all of it
 * is 9-13px).
 *
 * Tailwind opacity modifiers aren't a solid color until alpha-composited onto
 * whatever's actually behind the text, so most backgrounds are the page white,
 * but a few table header/row tints (HEADER_TINT, GROUP_TINT, the enrollment
 * table's active-row tint) sit underneath some muted text and are checked
 * against those tints too, via BG_OVERRIDES below.
 *
 * This SCANS the actual source (not a hand-typed snapshot) — new/changed
 * `text-sable/NN` spans are picked up automatically on the next run, so this
 * can't drift out of sync with the code the way a hardcoded table would.
 * BG_OVERRIDES is the one manually-maintained part: add an entry there if a
 * new muted-text span ever lands on a non-white background.
 *
 * Run: node scripts/audit-contrast.mjs  (or npm run audit:contrast)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { COLORS, compositeOver, contrastRatio } from "../src/config/theme.js";

const AA_NORMAL_TEXT = 4.5;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WHITE = "#FFFFFF";

// Files scanned for `text-sable/NN`. Kept as an explicit list (not a glob)
// so a stray script/test file never sneaks into the audit.
const FILES = [
  "src/App.jsx",
  "src/components/ChartExportCard.jsx",
  "src/components/ComparingChips.jsx",
  "src/components/ComparisonLegend.jsx",
  "src/components/ComparisonTrend.jsx",
  "src/components/DownloadPngButton.jsx",
  "src/components/EnrollmentComparisonCard.jsx",
  "src/components/EnrollmentComparisonTable.jsx",
  "src/components/EnrollmentPanel.jsx",
  "src/components/EnrollmentTable.jsx",
  "src/components/Footer.jsx",
  "src/lib/format.js",
  "src/components/MapLegend.jsx",
  "src/components/NationalOverviewCard.jsx",
  "src/components/OnboardingPanel.jsx",
  "src/components/RegulationCard.jsx",
  "src/components/RegulationComparisonTable.jsx",
  "src/components/RegulationPanel.jsx",
  "src/components/RemoveButton.jsx",
  "src/components/Sparkline.jsx",
  "src/components/StateDetailCard.jsx",
  "src/components/SummaryCard.jsx",
  "src/components/ViewTabs.jsx",
  "src/components/YearSelector.jsx",
  "src/components/ui/command.jsx",
  "src/components/ui/select.jsx",
  "src/components/ui/tooltip.jsx",
  "src/topics/enrollmentTopic.jsx",
  "src/topics/regulationTopic.jsx",
];

// Tints (as solid hex, pre-composited onto white) that some muted text sits
// on instead of plain white. Keyed by "relative/file/path.jsx:line".
// RegulationComparisonTable's group-column header (line 148) reuses one JSX
// spot for 3 different tints depending on which group renders, so it maps to
// an array — every variant gets checked.
const HEADER_TINT = compositeOver(COLORS.sable, 0.03, WHITE); // bg-sable/[0.03]
const REGISTRATION_TINT = compositeOver(COLORS.heritage, 0.06, WHITE); // bg-heritage/[0.06]
const INSTRUCTION_TINT = compositeOver(COLORS.gold, 0.09, WHITE); // bg-gold/[0.09]
const ASSESSMENT_TINT = compositeOver(COLORS.sable, 0.05, WHITE); // bg-sable/[0.05]
const ACTIVE_ROW_TINT = compositeOver(COLORS.sable, 0.03, WHITE); // bg-sable/[0.03]

const BG_OVERRIDES = {
  "src/components/RegulationComparisonTable.jsx:140": [HEADER_TINT],
  "src/components/RegulationComparisonTable.jsx:148": [
    REGISTRATION_TINT,
    INSTRUCTION_TINT,
    ASSESSMENT_TINT,
  ],
  "src/components/RegulationComparisonTable.jsx:155": [HEADER_TINT],
  "src/components/EnrollmentComparisonTable.jsx:104": [ACTIVE_ROW_TINT, WHITE],
};

const TEXT_SABLE_RE = /text-sable\/(\d{1,3})(?![0-9])/g;

// Non-opacity-modified pairings worth re-confirming alongside the muted-text
// sweep (solid colors, no compositing needed) — badge/label combos flagged
// in past design passes as "already checked."
const SOLID_PAIRINGS = [
  { label: "LevelBadge text (sable) on regulation Low fill", fg: COLORS.sable, bg: "#F1C400" },
  { label: "LevelBadge text (sable) on regulation Medium fill", fg: COLORS.sable, bg: "#FF9E1B" },
  { label: "LevelBadge text (sable) on regulation High fill", fg: COLORS.sable, bg: "#F56600" },
  { label: "white text on heritage fill (YearSelector active pill, OnboardingPanel step number)", fg: "#FFFFFF", bg: COLORS.heritage },
];

function scanFile(relPath) {
  const text = readFileSync(resolve(ROOT, relPath), "utf8");
  const lines = text.split("\n");
  const found = [];
  lines.forEach((lineText, i) => {
    for (const m of lineText.matchAll(TEXT_SABLE_RE)) {
      found.push({ file: relPath, line: i + 1, alpha: Number(m[1]) / 100 });
    }
  });
  return found;
}

function run() {
  const pairings = FILES.flatMap(scanFile);
  let failures = 0;

  console.log(`Opacity-modified text-sable/NN pairings (${pairings.length}):\n`);
  for (const p of pairings) {
    const key = `${p.file}:${p.line}`;
    const backgrounds = BG_OVERRIDES[key] ?? [WHITE];
    for (const bgHex of backgrounds) {
      const effective = compositeOver(COLORS.sable, p.alpha, bgHex);
      const ratio = contrastRatio(effective, bgHex);
      const pass = ratio >= AA_NORMAL_TEXT;
      if (!pass) failures += 1;
      const bgLabel = bgHex === WHITE ? "white" : bgHex;
      const loc = `${key}`.padEnd(50);
      console.log(
        `  [${pass ? "PASS" : "FAIL"}] ${loc} sable/${Math.round(p.alpha * 100)} on ${bgLabel.padEnd(9)} ${ratio.toFixed(2)}:1`,
      );
    }
  }

  console.log(`\nSolid-color pairings (${SOLID_PAIRINGS.length}):\n`);
  for (const p of SOLID_PAIRINGS) {
    const ratio = contrastRatio(p.fg, p.bg);
    const pass = ratio >= AA_NORMAL_TEXT;
    if (!pass) failures += 1;
    console.log(`  [${pass ? "PASS" : "FAIL"}] ${p.label} — ${ratio.toFixed(2)}:1`);
  }

  console.log(
    `\n${failures === 0 ? "All pairings pass" : `${failures} pairing(s) FAIL`} AA normal-text (${AA_NORMAL_TEXT}:1).`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

run();
