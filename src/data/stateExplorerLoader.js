/**
 * State Explorer loader — same "snapshot preferred, hand-entered fallback"
 * shape as enrollmentLoader.js/policyLoader.js. state-explorer-snapshot.json
 * (built by scripts/build-state-explorer-snapshot.mjs) covers more states,
 * more years, and better demographics than the original hand-entered
 * stateExplorerMockData.js. For a code the snapshot covers, everything comes
 * from the snapshot except `context` — the access/funding ("State context")
 * facts don't live in that workbook at all; they come from the Legislation
 * Google Sheet's access/funding columns, same source already wired up for
 * the Regulation view, via regulationLoader.js. Hawaii/Delaware's workbook
 * rows are too messy to trust unreviewed (see the build script) — they pass
 * through from the mock file untouched, aside from `context`.
 */

import {
  EXPLORER_STATES as HAND_ENTERED,
  valueForYear,
  DEFAULT_EXPLORER_STATE,
} from "./stateExplorerMockData.js";
import snapshot from "./state-explorer-snapshot.json";
import { regulationByState } from "./regulationLoader.js";
import { BY_POSTAL } from "../config/states.js";

export const EXPLORER_STATES = Object.fromEntries(
  [...new Set([...Object.keys(HAND_ENTERED), ...Object.keys(snapshot.states)])].map((code) => {
    const base = snapshot.states[code] ?? HAND_ENTERED[code];
    const context = regulationByState[BY_POSTAL[code]?.name]?.context ?? null;
    return [code, { ...base, context }];
  }),
);

export { valueForYear, DEFAULT_EXPLORER_STATE };
