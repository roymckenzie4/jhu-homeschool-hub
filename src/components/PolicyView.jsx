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
import { policyByState } from "../data/policyLoader.js";
import {
  LEVELS,
  LEVEL_ORDER,
  COMPARE_CAP,
  REGULATION_COUNT,
} from "../config/policy.js";
import { COLORS, levelColor } from "../config/theme.js";
import ChoroplethMap from "./ChoroplethMap.jsx";
import MapLegend from "./MapLegend.jsx";

// Legend swatches: one per level, colored + labeled with its count range.
const LEGEND_SWATCHES = LEVEL_ORDER.map((level) => ({
  color: levelColor(level),
  label: `${LEVELS[level].label} ${LEVELS[level].range}`,
}));

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
        <div className="mx-auto max-w-5xl">
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
    </>
  );
}
