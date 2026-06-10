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
 * Non-reporting states (no value for the active year) are handled
 * defensively: stats collapse to a single "Does not publicly report"
 * message, and the sparkline slot is omitted. The map currently blocks
 * clicks on non-reporting states, but this fallback keeps the card
 * robust if that ever changes.
 *
 * Inputs come pre-shaped from App.jsx; the card does no data lookup
 * itself beyond YoY computation against the previous year.
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
  sparklineMaxDeviation,
}) {
  const stateRankLabel = `of ${reportingCount} reporting`;
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
              <p className="font-sans text-xl font-semibold text-sable">
                {ordinal(rank)}
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
              <Sparkline
                series={trendSeries}
                maxDeviation={sparklineMaxDeviation}
                selectedYear={year}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="mt-6 font-sans text-sm leading-relaxed text-sable/70">
          {stateName} does not publicly report homeschool enrollment for{' '}
          {schoolYearLabel(year)}.
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
