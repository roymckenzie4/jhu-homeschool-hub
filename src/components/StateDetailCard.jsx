/**
 * Right-side detail card for the selected state.
 *
 * Layout follows the mockup top→bottom:
 *   1. State name
 *   2. Big headline number + two-line subtitle
 *   3. YoY chip (gold for positive, brick for negative) + national rank
 *   4. Sparkline (placeholder slot until Stage 5b adds shadcn-charts)
 *   5. "Read more about homeschool context in [State] →" external link
 *
 * A state with no value for the active year takes one of two no-data
 * paths, distinguished by whether it has reported in ANY year:
 *   - Has history (reported some other year): show the trend + a "not
 *     reported this year" note, so its record stays visible while a year
 *     it skipped is selected.
 *   - Never reported: collapse to a single "does not publicly report"
 *     message.
 * Every state on the map is clickable, so both paths are reachable.
 *
 * Inputs come pre-shaped from App.jsx; the card does no data lookup
 * itself beyond YoY computation and reading its own trendSeries.
 */

import { computeYoY } from '../data/derive.js';
import { formatNumber, formatYoY, ordinal } from '../lib/format.js';
import { schoolYearLabel, TRANSITION_MS } from '../config/theme.js';
import { BY_NAME } from '../config/states.js';
import Sparkline from './Sparkline.jsx';

const HOMESCHOOL_HUB_BASE =
  'https://education.jhu.edu/edpolicy/policy-research-initiatives/homeschool-hub/states';

export default function StateDetailCard({
  stateName,
  currentValue,
  previousValue,
  year,
  rank,
  reportingCount,
  dcReporting,
  trendSeries,
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

  // No-data states split on whether any year in their history reports. The
  // last reported point anchors the "not reported this year" note so the card
  // still says something concrete (e.g. "last reported 6,168 in 2012-13").
  const reportingPoints = (trendSeries ?? []).filter((d) => d.value != null);
  const hasHistory = reportingPoints.length > 0;
  const lastReported = hasHistory
    ? reportingPoints[reportingPoints.length - 1]
    : null;

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

          <hr className="my-4 border-t border-sable/15" />

          {/*
            Sparkline section grows to fill whatever vertical space remains
            between the stats above and the "Read more" link pinned to the
            card bottom. A `min-h-0` on the chart wrapper keeps the flex
            child from refusing to shrink below its content's intrinsic
            size, which is what Recharts' ResponsiveContainer needs.
          */}
          {/*
            Sparkline slot. In the desktop two-column layout this section is
            flex-1 inside an h-full card so it expands to fill remaining
            space. In single-column the card sizes to content, so there's
            no row to grow into — we give the chart wrapper an explicit
            height (h-24) at narrow widths and let lg: take over the
            flex-grow behavior above the breakpoint.
          */}
          <div className="flex flex-col lg:min-h-[90px] lg:flex-1">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
              Year in Context
            </p>
            <div className="mt-3 aspect-[5/2] lg:aspect-auto lg:h-auto lg:min-h-0 lg:flex-1">
              <Sparkline series={trendSeries} selectedYear={year} />
            </div>
          </div>
        </>
      ) : hasHistory ? (
        <>
          {/* Reported in other years, just not this one: lead with the gap,
              then keep the trend so the record stays visible. */}
          <p className="mt-3 font-sans text-sm leading-snug text-sable/70">
            Not reported for {schoolYearLabel(year)}.
          </p>
          <p className="mt-2 font-sans text-xs leading-snug text-sable">
            Last reported{' '}
            <span className="font-semibold text-sable">
              {formatNumber(lastReported.value)}
            </span>{' '}
            in {schoolYearLabel(lastReported.year)}.
          </p>

          <hr className="my-4 border-t border-sable/15" />

          <div className="flex flex-col lg:min-h-[90px] lg:flex-1">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
              Year in Context
            </p>
            <div className="mt-3 aspect-[5/2] lg:aspect-auto lg:h-auto lg:min-h-0 lg:flex-1">
              {/* selectedYear has no point this year, so the line shows the
                  full history with no active-year dot. */}
              <Sparkline series={trendSeries} selectedYear={year} />
            </div>
          </div>
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
          className="font-sans text-xs font-medium text-heritage underline-offset-4 hover:underline"
        >
          Read more about {stateName} →
        </a>
      </div>
      </div>
    </aside>
  );
}
