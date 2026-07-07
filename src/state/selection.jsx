/**
 * Selection context — the shared spine of the unified tool.
 *
 * Both topics (Enrollment, Regulation) and the shared map/chip row read one
 * source of truth for "which states am I looking at," so switching topics keeps
 * the selection intact and every control stays in sync.
 *
 * Two DISTINCT concepts live here:
 *   - selectedStates: the cohort — WHO is under examination (cap COMPARE_CAP).
 *   - focusedState:   the drill-in target — which ONE of the cohort is zoomed
 *                     into right now (or null for none).
 *
 * Mode is NOT stored; it's emergent from these two values (see useSelection):
 *   0 selected            -> national overview / empty prompt
 *   1 selected            -> single detail
 *   2+ selected, no focus -> comparison
 *   2+ selected + focus   -> that state's detail, with "back to comparison"
 *
 * Storing focus as a lens OVER the cohort (rather than a mode flag) keeps the
 * impossible states unrepresentable — same reasoning as the null-sentinel the
 * enrollment default already uses.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { COMPARE_CAP } from "../config/policy.js";

const SelectionContext = createContext(null);

export function SelectionProvider({ children }) {
  // The cohort. Order is insertion order (chip row + comparison rows follow it).
  const [selectedStates, setSelectedStates] = useState([]);
  // The drill-in lens over the cohort. Only consulted when 2+ are selected.
  const [focusedState, setFocusedState] = useState(null);

  // Add/remove a state from the cohort. At the cap, adding more is ignored.
  // Removing the currently-focused state clears the now-stale focus pointer.
  const toggleState = useCallback((name) => {
    setSelectedStates((prev) => {
      if (prev.includes(name)) {
        setFocusedState((f) => (f === name ? null : f));
        return prev.filter((n) => n !== name);
      }
      if (prev.length >= COMPARE_CAP) return prev;
      return [...prev, name];
    });
  }, []);

  // Empty the cohort and drop any focus.
  const clearAll = useCallback(() => {
    setSelectedStates([]);
    setFocusedState(null);
  }, []);

  // Drill into one cohort member. Ignores names outside the cohort so focus
  // can never point at a state that isn't being compared.
  const focusState = useCallback((name) => {
    setSelectedStates((prev) => {
      if (prev.includes(name)) setFocusedState(name);
      return prev;
    });
  }, []);

  // Return from a drill-in to the comparison, cohort untouched.
  const clearFocus = useCallback(() => setFocusedState(null), []);

  const value = useMemo(
    () => ({
      selectedStates,
      focusedState,
      toggleState,
      clearAll,
      focusState,
      clearFocus,
    }),
    [selectedStates, focusedState, toggleState, clearAll, focusState, clearFocus],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

// Read the shared selection. Throws outside a provider so a mis-mounted
// component fails loudly instead of silently reading a null context.
export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (ctx == null) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return ctx;
}
