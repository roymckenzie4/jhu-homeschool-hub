/**
 * Summary card for the selected state — sits top-right beside the map, at the
 * map's height.
 *
 * Layout top→bottom:
 *   1. State name
 *   2. Big headline number + two-line subtitle
 *   3. YoY chip (gold for positive, brick for negative) + national rank
 *   4. "Read more about homeschool context in [State] →" external link + back
 *
 * The state's trend graph and by-year table live in the shell's full-width data
 * zone (see EnrollmentPanel), not in this card — the card is a compact summary.
 *
 * A state with no value for the active year takes one of two no-data paths,
 * distinguished by whether it has reported in ANY year (both computed upstream
 * in EnrollmentPanel and passed in):
 *   - Has history (reported some other year): a "not reported this year" note
 *     with the last reported figure, so its record stays visible while a year
 *     it skipped is selected. Its trend still shows in the data zone.
 *   - Never reported: collapse to a single "does not publicly report" message.
 * Every state on the map is clickable, so both paths are reachable.
 *
 * Inputs come pre-shaped from EnrollmentPanel; the card does no data lookup
 * itself beyond YoY computation.
 */

import { computeYoY } from '../data/derive.js';
import { formatNumber, formatYoY, ordinal } from '../lib/format.js';
import { schoolYearLabel, TRANSITION_MS } from '../config/theme.js';
import { BY_NAME } from '../config/states.js';

const HOMESCHOOL_HUB_BASE =
  'https://education.jhu.edu/edpolicy/policy-research-initiatives/homeschool-hub/states';

export default function StateDetailCard({
  stateName,
  currentValue,
  previousValue,
  year,
  rank,
  reportingCount,
  // Whether the state has reported in any year, and its last reported point —
  // drive the no-data copy. Derived upstream from the same trend series the
  // data-zone graph uses.
  hasHistory,
  lastReported,
  // Back control at the card foot. Label + handler vary by mode: single detail
  // returns to the national overview (clears the cohort); a drill-in from a
  // comparison returns to the comparison (clears focus, cohort intact).
  backLabel,
  onBack,
}) {
  // Rank 1 = most reported homeschoolers that year. Show "Nth of M" so it reads
  // as a rank out of the reporting jurisdictions, with the caption naming the
  // metric (student count) so it isn't mistaken for some other ranking.
  const stateRankValue = `${ordinal(rank)} of ${reportingCount}`;
  const stateRankLabel = "by reported count";
  const slug = BY_NAME[stateName]?.slug ?? '';
  const isReporting = currentValue != null;
  const yoy = computeYoY(currentValue, previousValue);
  const yoyPositive = yoy != null && yoy > 0;

  return (
    <aside
      className="flex flex-col border border-l-4 border-sable/10 border-l-heritage bg-white px-6 py-4 lg:h-full"
      style={{ transitionDuration: `${TRANSITION_MS}ms` }}
    >
      {/*
        Content keyed by stateName so React remounts the subtree on every
        selection swap; tw-animate-css plays a brief fade so the swap reads
        as deliberate rather than as a flash of new numerals. The card frame
        (border + left bar) stays mounted to avoid double-animating it.
        h-full is scoped to lg: so the card sizes to its content in
        single-column mode — otherwise the height carries over from the
        desktop row span and only corrects on the next selection.
      */}
      <div
        key={stateName}
        className="flex flex-col animate-fade-in lg:h-full"
      >
        <h3 className="font-sans text-lg font-semibold text-sable">
          {stateName}
        </h3>

      {isReporting ? (
        <>
          <p className="mt-3 font-sans text-4xl font-bold leading-none text-sable">
            {formatNumber(currentValue)}
          </p>
          <p className="mt-2 font-sans text-xs leading-snug text-sable">
            reported homeschool students, {schoolYearLabel(year)}
          </p>

          <hr className="my-4 border-t border-sable/15" />

          {/* Two-column stat row: YoY chip + national rank. */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p
                className={`font-sans text-xl font-semibold ${
                  yoyPositive ? 'text-gold' : 'text-brick'
                }`}
              >
                {formatYoY(yoy)}
              </p>
              <p className="mt-1 font-sans text-[11px] text-sable/60">
                vs. {schoolYearLabel(year - 1)}
              </p>
            </div>
            <div>
              <p className="whitespace-nowrap font-sans text-xl font-semibold text-sable">
                {stateRankValue}
              </p>
              <p className="mt-1 whitespace-nowrap font-sans text-[11px] text-sable/60">
                {stateRankLabel}
              </p>
            </div>
          </div>
        </>
      ) : hasHistory ? (
        // Reported in other years, just not this one. No headline figure — a
        // current count would be misleading — just a short lead line and a
        // dated "last reported" caption. The trend still renders in the data
        // zone, so the record stays visible.
        <>
          <p className="mt-4 font-sans text-sm leading-snug text-sable">
            Not reported for {schoolYearLabel(year)}.
          </p>
          <p className="mt-1 font-sans text-xs leading-snug text-sable/60">
            Last reported{' '}
            <span className="font-semibold text-sable">
              {formatNumber(lastReported.value)}
            </span>{' '}
            in {schoolYearLabel(lastReported.year)}.
          </p>
        </>
      ) : (
        <p className="mt-6 font-sans text-sm leading-relaxed text-sable/70">
          {stateName} does not publicly report homeschool enrollment.
        </p>
      )}

      {/*
        Bottom block: hr + link grouped together and pinned to card bottom.
        Margin on hr above and below visually centers it between the sparkline
        and the link rather than letting flex-1 above starve the space.
      */}
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
        {/* Back control. Muted so it reads as secondary to the heritage
            "Read more" link above it. Label + target set by the caller. */}
        <button
          type="button"
          onClick={onBack}
          className="mt-2 block font-sans text-xs text-sable/60 underline-offset-4 hover:text-heritage hover:underline"
        >
          ← {backLabel}
        </button>
      </div>
      </div>
    </aside>
  );
}
