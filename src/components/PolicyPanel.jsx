/**
 * PolicyPanel — the regulation topic's below-the-shell content.
 *
 * The unified shell (App) owns the shared map, legend, and chip row; this panel
 * renders only the side-by-side regulation comparison table. Reads the cohort
 * from the shared selection and dispatches per-row removal back through it.
 *
 * All regulation data comes through the policy loader, never the CSV directly.
 */

import { useSelection } from "../state/selection.jsx";
import { policyByState } from "../data/policyLoader.js";
import PolicyComparisonTable from "./PolicyComparisonTable.jsx";
import { trackEvent } from "../lib/analytics.js";

export default function PolicyPanel() {
  const { selectedStates, toggleState } = useSelection();

  // Removing a state from within the table logs under this topic, matching the
  // shell map's selection events.
  function removeState(name) {
    toggleState(name);
    trackEvent("state_select", { view: "policy", state: name });
  }

  return (
    <PolicyComparisonTable
      selectedStates={selectedStates}
      policyByState={policyByState}
      onRemove={removeState}
    />
  );
}
