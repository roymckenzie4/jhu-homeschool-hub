/**
 * State Explorer loader — same "snapshot preferred, hand-entered fallback"
 * shape as enrollmentLoader.js/policyLoader.js. state-explorer-snapshot.json
 * (built by scripts/build-state-explorer-snapshot.mjs) covers more states,
 * more years, and better demographics than the original hand-entered
 * stateExplorerMockData.js. For a code the snapshot covers, everything comes
 * from the snapshot except `context` — the workbook has no access/funding
 * fields, so that one stays hand-entered (or null for a state never hand-
 * entered at all). Hawaii/Delaware's workbook rows are too messy to trust
 * unreviewed (see the build script) — they pass through from the mock file
 * untouched.
 */

import {
  EXPLORER_STATES as HAND_ENTERED,
  valueForYear,
  DEFAULT_EXPLORER_STATE,
} from "./stateExplorerMockData.js";
import snapshot from "./state-explorer-snapshot.json";

export const EXPLORER_STATES = Object.fromEntries(
  [...new Set([...Object.keys(HAND_ENTERED), ...Object.keys(snapshot.states)])].map((code) => {
    const live = snapshot.states[code];
    if (!live) return [code, HAND_ENTERED[code]];
    return [code, { ...live, context: HAND_ENTERED[code]?.context ?? null }];
  }),
);

export { valueForYear, DEFAULT_EXPLORER_STATE };
