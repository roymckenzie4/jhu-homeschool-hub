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
import { COLORS, levelColor, TRANSITION_MS } from "../config/theme.js";
import { BY_NAME } from "../config/states.js";

const HOMESCHOOL_HUB_BASE =
  "https://education.jhu.edu/edpolicy/policy-research-initiatives/homeschool-hub/states";

const CARD_CLASS =
  "flex flex-col border border-l-4 border-sable/10 border-l-heritage bg-white px-6 py-4 lg:h-full lg:overflow-y-auto";

// Level pill — heritage-warm fill per level, white text only on the darkest.
function LevelBadge({ level }) {
  if (!level) return null;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold"
      style={{
        backgroundColor: levelColor(level),
        color: level === "High" ? "#FFFFFF" : COLORS.sable,
      }}
    >
      {LEVELS[level].label}
    </span>
  );
}

export default function PolicyCard({ selectedStates, policyByState }) {
  const count = selectedStates.length;

  return (
    <aside className={CARD_CLASS} style={{ transitionDuration: `${TRANSITION_MS}ms` }}>
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
        />
      )}
    </aside>
  );
}

// National split across all jurisdictions, paralleling the enrollment overview's
// leaderboard: how many states sit at each regulation level.
function Overview({ policyByState }) {
  const entries = Object.values(policyByState);
  return (
    <>
      <h3 className="font-sans text-lg font-semibold text-sable">
        State regulation
      </h3>
      <p className="mt-2 font-sans text-xs leading-snug text-sable/70">
        How each state regulates homeschooling, across {REGULATION_COUNT} policy
        areas in three groups.
      </p>

      <hr className="my-4 border-t border-sable/15" />

      <p className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
        States by Regulation Level
      </p>
      <ul className="mt-3 space-y-2">
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

      <p className="mt-4 flex-1 font-sans text-xs leading-relaxed text-sable/60">
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
      <h3 className="font-sans text-lg font-semibold text-sable">{stateName}</h3>

      <div className="mt-3 flex items-center gap-2">
        <LevelBadge level={entry?.level} />
        <span className="font-sans text-sm text-sable">
          <span className="font-bold">
            {entry?.total ?? 0} of {REGULATION_COUNT}
          </span>{" "}
          regulations in force
        </span>
      </div>

      <hr className="my-4 border-t border-sable/15" />

      <ul className="space-y-2">
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

      <div className="mt-auto">
        <hr className="mb-3 mt-3 border-t border-sable/15" />
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

// 2+ states: a compact roster — each state's level badge + count in force, in
// selection order — paralleling the enrollment comparison leaderboard. The full
// side-by-side breakdown lives in the table.
function ComparisonSummary({ selectedStates, policyByState }) {
  return (
    <>
      <h3 className="font-sans text-lg font-semibold text-sable">
        Comparing {selectedStates.length} states
      </h3>
      <p className="mt-2 font-sans text-xs leading-snug text-sable/70">
        regulation level, of {REGULATION_COUNT} policy areas
      </p>

      <hr className="my-4 border-t border-sable/15" />

      <ul className="space-y-2.5">
        {selectedStates.map((name) => {
          const entry = policyByState[name];
          return (
            <li
              key={name}
              className="flex items-center gap-3 font-sans text-xs"
            >
              <span className="truncate font-medium tracking-[0.03em] text-sable">
                {name}
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-2">
                <LevelBadge level={entry?.level} />
                <span className="tabular-nums text-sable/60">
                  {entry?.total ?? 0}/{REGULATION_COUNT}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 flex-1 font-sans text-xs leading-relaxed text-sable/60">
        The table shows each state's requirements side by side.
      </p>
    </>
  );
}
