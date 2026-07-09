/**
 * Summary card for the Regulation tab — the policy counterpart to the
 * enrollment card slot, so both tabs read as one tool. Emergent from the shared
 * selection, matching EnrollmentPanel's three modes:
 *   - 0 selected -> overview: the national Low/Medium/High split + a prompt.
 *   - 1 selected -> that state's regulation detail (level, count, per-group
 *     tally, "read more" link).
 *   - 2+ selected -> a light comparison summary pointing at the table.
 *
 * Shares the enrollment cards' frame (border + left bar + fill-the-map-height)
 * so it drops into the same slot at matching height. All regulation data is
 * passed in from PolicyPanel (via the loader); no lookup here beyond tallying.
 */

import {
  REGULATION_GROUPS,
  REGULATION_COUNT,
  LEVELS,
  LEVEL_ORDER,
} from "../config/policy.js";
import { COLORS, levelColor } from "../config/theme.js";
import { BY_NAME } from "../config/states.js";
import SummaryCard, {
  CARD_HEADING_CLASS,
  CARD_DIVIDER_CLASS,
  CARD_EYEBROW_CLASS,
  CARD_LIST_CLASS,
  CARD_CAVEAT_CLASS,
} from "./SummaryCard.jsx";

const HOMESCHOOL_HUB_BASE =
  "https://education.jhu.edu/edpolicy/policy-research-initiatives/homeschool-hub/states";

const EM_DASH = "—";

// Compulsory-schooling age range, e.g. "6–17"; em dash if either bound absent.
function ageRange(min, max) {
  return min == null || max == null ? EM_DASH : `${min}–${max}`;
}

function numberOrDash(n) {
  return n == null ? EM_DASH : String(n);
}

// Compact one-line legislation summary for the comparison roster — skips any
// missing piece rather than printing dashes inline. Terse (e.g. "ages 6–18 ·
// 12 years · 1948") since it sits inline between the state name and its badge.
function legislationLine(leg) {
  const parts = [];
  if (leg.compMinAge != null && leg.compMaxAge != null) {
    parts.push(`ages ${leg.compMinAge}–${leg.compMaxAge}`);
  }
  if (leg.yearsRequired != null) parts.push(`${leg.yearsRequired} years`);
  if (leg.legalized != null) parts.push(`${leg.legalized}`);
  return parts.join(" · ");
}

// Level pill — heritage-warm fill per level, white text only on the darkest.
function LevelBadge({ level }) {
  if (!level) return null;
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 font-sans text-[10px] font-semibold"
      style={{
        backgroundColor: levelColor(level),
        color: level === "High" ? "#FFFFFF" : COLORS.sable,
      }}
    >
      {LEVELS[level].label}
    </span>
  );
}

// Compulsory-schooling + legalization facts from the sheet's Legislation tab.
// Absent on the CSV fallback (snapshot-only), so the block hides itself then.
function LegislationFacts({ legislation }) {
  if (!legislation) return null;
  const { compMinAge, compMaxAge, yearsRequired, legalized } = legislation;
  const rows = [
    ["Compulsory age", ageRange(compMinAge, compMaxAge)],
    ["Years required", numberOrDash(yearsRequired)],
    ["Homeschooling legalized", numberOrDash(legalized)],
  ];
  return (
    <>
      <hr className={CARD_DIVIDER_CLASS} />
      <p className={CARD_EYEBROW_CLASS}>State context</p>
      <ul className={CARD_LIST_CLASS}>
        {rows.map(([label, value]) => (
          <li
            key={label}
            className="flex items-baseline justify-between font-sans text-xs"
          >
            <span className="text-sable/70">{label}</span>
            <span className="font-semibold tabular-nums text-sable">{value}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PolicyCard({ selectedStates, policyByState, onClear }) {
  const count = selectedStates.length;

  return (
    <SummaryCard>
      {count === 0 ? (
        <Overview policyByState={policyByState} />
      ) : count === 1 ? (
        <Detail
          stateName={selectedStates[0]}
          entry={policyByState[selectedStates[0]]}
        />
      ) : (
        <ComparisonSummary
          selectedStates={selectedStates}
          policyByState={policyByState}
          onClear={onClear}
        />
      )}
    </SummaryCard>
  );
}

// National split across all jurisdictions, paralleling the enrollment overview's
// leaderboard: how many states sit at each regulation level.
function Overview({ policyByState }) {
  const entries = Object.values(policyByState);
  return (
    <>
      <h3 className={CARD_HEADING_CLASS}>State regulation</h3>
      <p className="mt-2 font-sans text-xs leading-snug text-sable/70">
        How each state regulates homeschooling, across {REGULATION_COUNT}{" "}
        regulations in three groups.
      </p>

      <hr className={CARD_DIVIDER_CLASS} />

      <p className={CARD_EYEBROW_CLASS}>States by Regulation Level</p>
      <ul className={CARD_LIST_CLASS}>
        {LEVEL_ORDER.map((level) => {
          const n = entries.filter((e) => e.level === level).length;
          return (
            <li key={level} className="flex items-center gap-3 font-sans text-xs">
              <LevelBadge level={level} />
              <span className="text-sable/60">{LEVELS[level].range} in force</span>
              <span className="ml-auto font-bold tabular-nums text-sable">{n}</span>
            </li>
          );
        })}
      </ul>

      <p className={CARD_CAVEAT_CLASS}>
        Select states on the map to compare their requirements side by side.
      </p>
    </>
  );
}

// One state's regulation profile: level, count in force, and a per-group tally.
function Detail({ stateName, entry }) {
  const slug = BY_NAME[stateName]?.slug ?? "";
  return (
    <>
      <h3 className={CARD_HEADING_CLASS}>{stateName}</h3>

      {/* Profile-style level stat: the level as the anchor, count as the read. */}
      <div className="mt-3 flex items-center gap-2">
        <LevelBadge level={entry?.level} />
        <span className="font-sans text-[15px] font-semibold text-sable">
          {entry?.level ? `${LEVELS[entry.level].label} regulation` : "—"}
        </span>
      </div>
      <p className="mt-1 font-sans text-xs text-sable/60">
        {entry?.total ?? 0} of {REGULATION_COUNT} regulations in force
      </p>

      <hr className={CARD_DIVIDER_CLASS} />

      <p className={CARD_EYEBROW_CLASS}>Regulations</p>
      <ul className={CARD_LIST_CLASS}>
        {REGULATION_GROUPS.map((group) => {
          const yes = group.regulations.filter(
            (r) => entry?.regulations?.[r.key]?.value,
          ).length;
          return (
            <li
              key={group.id}
              className="flex items-baseline justify-between font-sans text-xs"
            >
              <span className="text-sable/70">{group.label}</span>
              <span className="tabular-nums text-sable">
                <span className="font-semibold">{yes}</span>
                <span className="text-sable/45"> / {group.regulations.length}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <LegislationFacts legislation={entry?.legislation} />

      <div className="mt-auto border-t border-sable/15 pt-2.5">
        <a
          href={`${HOMESCHOOL_HUB_BASE}/${slug}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="block font-sans text-xs font-medium text-heritage underline-offset-4 hover:underline"
        >
          Read more about {stateName} →
        </a>
      </div>
    </>
  );
}

// 2+ states: a compact roster, ONE line per state (name · muted legal context ·
// badge + score) in selection order — orients quickly without turning into a
// stack of mini-profiles. The full side-by-side breakdown lives in the table.
function ComparisonSummary({ selectedStates, policyByState, onClear }) {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <h3 className={CARD_HEADING_CLASS}>
          Comparing {selectedStates.length} states
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="font-sans text-xs text-sable/60 underline-offset-4 hover:text-heritage hover:underline"
        >
          Clear
        </button>
      </div>
      {/* Muted key so the middle metadata (e.g. "ages 5–18 · 13 yrs · 2008")
          is decodable without reading like a stiff table header. */}
      <p className="mt-1.5 font-sans text-[11px] text-sable/45">
        State · age range · years required · law year · level
      </p>

      <hr className={CARD_DIVIDER_CLASS} />

      {/* Rows breathe through spacing, not rules — the source-linked table
          below does the table job. */}
      <ul className="space-y-2">
        {selectedStates.map((name) => {
          const entry = policyByState[name];
          return (
            <li
              key={name}
              className="flex items-center gap-2 font-sans text-xs"
            >
              <span className="shrink-0 font-medium text-sable">{name}</span>
              {entry?.legislation && (
                <span className="flex-1 truncate text-[11px] tabular-nums text-sable/50">
                  {legislationLine(entry.legislation)}
                </span>
              )}
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                <LevelBadge level={entry?.level} />
                <span className="tabular-nums text-sable/60">
                  {entry?.total ?? 0}/{REGULATION_COUNT}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className={CARD_CAVEAT_CLASS}>
        See the table below for source-linked requirements.
      </p>
    </>
  );
}
