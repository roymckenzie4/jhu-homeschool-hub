/**
 * PolicyView — the State policies view: a regulation heatmap with multi-state
 * comparison.
 *
 * Owns one piece of interactive state, `selectedStates` (a list, capped at
 * COMPARE_CAP), and starts empty. The shared ChoroplethMap shades every
 * jurisdiction by its regulation level; clicking a state toggles it into the
 * comparison set. The "Comparing" chip row (Step 5) and the side-by-side
 * comparison table (Step 6) build on this same selection.
 *
 * All regulation data comes through the policy loader, never the CSV directly.
 */

import { useState } from "react";
import { policyByState, policyCsvText } from "../data/policyLoader.js";
import {
  LEVELS,
  LEVEL_ORDER,
  COMPARE_CAP,
  REGULATION_COUNT,
  POLICY_DOWNLOAD_FILENAME,
} from "../config/policy.js";
import { COLORS, levelColor } from "../config/theme.js";
import ChoroplethMap from "./ChoroplethMap.jsx";
import MapLegend from "./MapLegend.jsx";
import ComparingChips from "./ComparingChips.jsx";
import PolicyComparisonTable from "./PolicyComparisonTable.jsx";
import Footer from "./Footer.jsx";

// Legend swatches: one per level, colored + labeled with its count range.
const LEGEND_SWATCHES = LEVEL_ORDER.map((level) => ({
  color: levelColor(level),
  label: `${LEVELS[level].label} ${LEVELS[level].range}`,
}));

// Live level distribution across all jurisdictions, computed once — keeps the
// "About this data" counts honest against the dataset (never hard-coded).
const LEVEL_DISTRIBUTION = Object.values(policyByState).reduce(
  (dist, entry) => {
    dist[entry.level] += 1;
    return dist;
  },
  { Low: 0, Medium: 0, High: 0 },
);

// "About this data" copy for the shared footer disclosure (placeholder wording;
// JHU owns final copy).
const POLICY_ABOUT = (
  <>
    Each state is scored across {REGULATION_COUNT} homeschool regulations grouped
    into registration, instruction, and assessment requirements. A state's
    regulation level reflects how many are in force — Low (0–3), Medium (4–6), or
    High (7–10) — currently {LEVEL_DISTRIBUTION.Low} Low,{" "}
    {LEVEL_DISTRIBUTION.Medium} Medium, and {LEVEL_DISTRIBUTION.High} High. The
    Homeschoolers column draws on the enrollment dataset and shows each state's
    figure for the latest year, or “not reported” where the state does not
    publish one. Figures are illustrative placeholders pending the verified
    dataset.
  </>
);

export default function PolicyView() {
  const [selectedStates, setSelectedStates] = useState([]);

  // Click toggles a state in/out of the comparison. At the cap, adding more is
  // ignored (the chip row in Step 5 surfaces this limit to the user).
  function toggleState(name) {
    setSelectedStates((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= COMPARE_CAP) return prev;
      return [...prev, name];
    });
  }

  return (
    <>
      <header>
        <h1 className="font-sans text-3xl font-medium leading-[1.2] tracking-tight text-sable">
          Homeschool oversight ranges from states with{" "}
          <span className="font-bold">no</span> requirements to those enforcing
          all <span className="font-bold">{REGULATION_COUNT}</span> regulations
          we track.
        </h1>
        <p className="mt-2 max-w-4xl font-sans text-xs leading-relaxed text-sable/70">
          Select states to compare their registration, instruction, and
          assessment requirements side by side. The map shades each state by how
          many of the {REGULATION_COUNT} regulations it has in force.
        </p>
      </header>

      <h2 className="mt-4 font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
        Regulation by State
      </h2>
      <hr className="mt-3 border-t border-sable/15" />

      <div className="mt-3">
        {/* Map matched to the Enrollment view's width for cross-view
            consistency and to keep the fixed-frame height budget. */}
        <div className="mx-auto" style={{ maxWidth: "calc(320px * 760 / 460)" }}>
          <ChoroplethMap
            fillForState={(name) => levelColor(policyByState[name]?.level)}
            selectedStates={selectedStates}
            onSelect={toggleState}
            selectionStroke={COLORS.heritage}
            ariaLabelForState={(name) => {
              const entry = policyByState[name];
              return entry
                ? `${name}, ${entry.level} regulation, ${entry.total} of ${REGULATION_COUNT} in force`
                : name;
            }}
          />
        </div>
        <div className="mt-2">
          <MapLegend
            label="Regulation level, Count in force"
            swatches={LEGEND_SWATCHES}
            trailing={
              <span className="whitespace-nowrap text-sable/55">
                Click states to compare · {REGULATION_COUNT} tracked regulations
              </span>
            }
          />
        </div>
      </div>

      <ComparingChips
        selectedStates={selectedStates}
        policyByState={policyByState}
        onAdd={toggleState}
        onRemove={toggleState}
        onClear={() => setSelectedStates([])}
      />

      <div className="mt-4">
        <PolicyComparisonTable
          selectedStates={selectedStates}
          policyByState={policyByState}
          onRemove={toggleState}
        />
      </div>

      <Footer
        about={POLICY_ABOUT}
        csvText={policyCsvText}
        downloadFilename={POLICY_DOWNLOAD_FILENAME}
      />
    </>
  );
}
