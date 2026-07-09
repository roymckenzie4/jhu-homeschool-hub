/**
 * Shared frame + spacing tokens for the four summary cards that sit top-right
 * beside the map (NationalOverview / StateDetail / EnrollmentComparison on
 * Enrollment, PolicyCard on Regulation). One source so their internal rhythm —
 * padding, top-space above the headline, divider margins, list and eyebrow
 * spacing — stays identical across selection modes and tab switches. The frame
 * string was copy-pasted across all four before, drifting between three
 * paddings; retune the rhythm here and every card follows.
 *
 * SummaryCard owns the outer frame (border + heritage left bar + padding + the
 * shared selection transition). The CARD_* class constants are applied by each
 * card to its own heading / hr / eyebrow / list / caveat so those match too.
 */

import { TRANSITION_MS } from "../config/theme.js";

// Section heading — state name / "Comparing N states" / "State regulation".
export const CARD_HEADING_CLASS = "font-sans text-lg font-semibold text-sable";

// Divider between the headline block and the list/tally below it. Kept tight
// (my-3) so the tallest card — Regulation single-state, with two eyebrow+list
// blocks — still fits under the map height; row spacing carries the breathing.
export const CARD_DIVIDER_CLASS = "my-3 border-t border-sable/15";

// Small uppercase label over a list (e.g. "State context", "Regulations").
export const CARD_EYEBROW_CLASS =
  "font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70";

// Eyebrow-to-list gap + vertical rhythm between list rows.
export const CARD_LIST_CLASS = "mt-2 space-y-2";

// Trailing caveat/prompt that fills the card's remaining height.
export const CARD_CAVEAT_CLASS =
  "mt-4 flex-1 font-sans text-xs leading-relaxed text-sable/60";

// Outer frame: border + heritage left bar, white fill, padding, and the shared
// selection transition. lg:h-full pins it to the map's height; it scrolls
// internally only if a mode would overflow.
const FRAME_CLASS =
  "flex flex-col border border-l-4 border-sable/10 border-l-heritage bg-white px-6 py-3 lg:h-full lg:overflow-y-auto";

export default function SummaryCard({ children }) {
  return (
    <aside
      className={FRAME_CLASS}
      style={{ transitionDuration: `${TRANSITION_MS}ms` }}
    >
      {children}
    </aside>
  );
}
