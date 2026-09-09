/**
 * StateExplorerPanel — first-pass concept for the Phase 2 "State Explorer" tab.
 *
 * Single-state drill-in: a sub-state region breakdown (when the state reports
 * one) and demographic subgroup breakdowns (grade/gender/race/etc., when the
 * state reports any). Deliberately NOT wired to a real loader — see
 * stateExplorerMockData.js — since JHU's data shape (wide vs. long) and
 * sub-state geography approach are both still being decided.
 *
 * Structure borrows the shell's two-column RHYTHM (map-ish visual left, data
 * zone below) but deliberately skips its bordered-card treatment: a
 * single-state drill-in is a different depth of content than the shared
 * national map's three emergent modes, and forcing it into an identical
 * boxed-card shape read as a thin copy of the other tabs rather than its own
 * page. Row 1 is the sub-state map beside a PLAIN (unboxed) text headline —
 * same typography/color tokens as everywhere else, just without a
 * border/background — and row 2 is the region table beside the demographic
 * breakdown, the same table+chart pairing shape Enrollment uses. There's no
 * shared chip row — the explorer is inherently single-state.
 *
 * Both rows hold a FIXED height regardless of which state is selected: row 1
 * is pinned to EXPLORER_MAP_VIEW_W/H (a real map, or a same-box placeholder
 * when a state has no published boundaries — see NoMapPlaceholder) — the
 * SAME aspect ratio as the national ChoroplethMap, so this row is also the
 * same height as Enrollment/Regulation's map row; row 2 reuses
 * ENROLLMENT_TABLE_HEIGHT directly. So switching states here — or switching
 * tabs entirely — never visibly resizes the page, and the whole view stays
 * inside the fixed-height iframe budget the rest of the tool is built to.
 *
 * Georgia and Louisiana's sub-geography render as REAL county/district maps
 * (US Census boundaries — Georgia via us-atlas, Louisiana via Census/NCES
 * TIGER + mapshaper — fetched from public/state-explorer-geo/). Hawaii's real
 * district ("complex area") boundaries were checked and aren't published
 * federal geography, so it shows its real ranked list with no map rather than
 * a fabricated one.
 *
 * No map-click-to-filter interaction yet: JHU's draft data has almost no
 * overlap between "has a sub-state breakdown" and "has a demographic
 * breakdown" (Hawaii and Louisiana here, deliberately, to exercise the
 * layout — but real-world it's rare). Cheap to add once more states report
 * both.
 */

import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import {
  ReadMoreLink,
  CARD_DIVIDER_CLASS,
  CARD_EYEBROW_CLASS,
  CARD_LIST_CLASS,
} from "./SummaryCard.jsx";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./ui/table.jsx";
import {
  RAMP_STEPS,
  COLORS,
  comparisonColor,
  computeQuantileBreaks,
  rangeLabel,
} from "../config/theme.js";
import { formatNumber } from "../lib/format.js";
import { buildStateProjection } from "../lib/geoProjection.js";
import { BY_NAME } from "../config/states.js";
import MapLegend from "./MapLegend.jsx";
import {
  ENROLLMENT_TABLE_HEIGHT,
  DATA_ZONE_MIN_HEIGHT,
  EXPLORER_MAP_VIEW_W,
  EXPLORER_MAP_VIEW_H,
  TWO_COLUMN_GRID_CLASS,
} from "../config/layout.js";
import { EXPLORER_STATES } from "../data/stateExplorerMockData.js";

// Section-heading convention shared by Enrollment/Regulation's data-zone
// headings (see EnrollmentPanel.jsx) — kept local here since this page's data
// zone isn't part of the shell's shared grid.
const SECTION_HEADING_CLASS =
  "font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70";

// Real per-state boundary files, fetched once and cached module-level
// (survives remounts/tab switches) — mirrors ChoroplethMap's national-map
// fetch pattern. Only Georgia and Louisiana exist today; see the file header.
const geoFileByState = { GA: "ga-counties.json", LA: "la-districts.json" };
const geoCache = new Map();

// Same quantile-bucket logic as the national map's fillForValue (see
// topics/enrollmentTopic.jsx) — reused rather than reinvented, so the two
// maps' color language reads as one system. `breaks` comes from
// computeQuantileBreaks over the state's own region values, so the ramp
// reflects THIS state's real spread, not a hardcoded percent-of-max split.
function fillForValue(value, breaks) {
  if (value == null || !breaks) return COLORS.nonReportingGround;
  for (let i = 0; i < RAMP_STEPS.length; i += 1) {
    if (value <= breaks[i + 1]) return RAMP_STEPS[i];
  }
  return RAMP_STEPS[RAMP_STEPS.length - 1];
}

// Sub-state map, fit to EXPLORER_MAP_VIEW_W/H and filling its aspect-ratio
// parent box (h-full/w-full) the same way the national ChoroplethMap fills
// its own column — so this box and NoMapPlaceholder below are interchangeable
// at the exact same footprint.
function RegionMap({ stateKey, regions, breaks }) {
  const [topo, setTopo] = useState(geoCache.get(stateKey) ?? null);

  // Always resolves `topo` to match the CURRENT stateKey, not just fetches on
  // a cache miss — this component stays mounted across state switches (it
  // isn't remounted just because stateKey changes), so a cache HIT still has
  // to explicitly sync `topo` via setTopo. Without this, revisiting a
  // previously-loaded state left `topo` holding whichever state was fetched
  // last, rendering that state's shape under the new state's data.
  useEffect(() => {
    let cancelled = false;
    const cached = geoCache.get(stateKey);
    if (cached) {
      setTopo(cached);
      return;
    }
    const url = `${import.meta.env.BASE_URL}state-explorer-geo/${geoFileByState[stateKey]}`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        geoCache.set(stateKey, json);
        setTopo(json);
      });
    return () => {
      cancelled = true;
    };
  }, [stateKey]);

  const valueByName = useMemo(() => {
    const map = new Map();
    for (const r of regions) map.set(r.name.toLowerCase(), r.value);
    return map;
  }, [regions]);

  const geo = useMemo(() => {
    if (!topo) return null;
    const objectName = Object.keys(topo.objects)[0];
    return feature(topo, topo.objects[objectName]);
  }, [topo]);

  const projected = useMemo(() => {
    if (!geo) return null;
    return buildStateProjection(geo, EXPLORER_MAP_VIEW_W, EXPLORER_MAP_VIEW_H);
  }, [geo]);

  if (!geo || !projected) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-sable/70">
        Loading map…
      </div>
    );
  }

  const { path } = projected;

  return (
    <svg
      viewBox={`0 0 ${EXPLORER_MAP_VIEW_W} ${EXPLORER_MAP_VIEW_H}`}
      role="img"
      aria-label={`${stateKey} map by region`}
      className="block h-full w-full"
    >
      {geo.features.map((f) => {
        const name = f.properties?.name?.toLowerCase();
        const value = valueByName.get(name) ?? null;
        return (
          <path
            key={f.id}
            d={path(f)}
            fill={fillForValue(value, breaks)}
            stroke="#fff"
            strokeWidth={0.5}
          >
            <title>
              {f.properties?.name}
              {value != null ? `: ${formatNumber(value)}` : ""}
            </title>
          </path>
        );
      })}
    </svg>
  );
}

// Fills the same aspect-ratio box as RegionMap for a state with no published
// sub-state boundaries — an honest "we don't have this" rather than a faked
// map or an empty gap, at the identical footprint so the row never resizes.
// Plain text, no border/shading — matches DataPlaceholder's treatment below
// rather than standing out as its own kind of empty state.
function NoMapPlaceholder({ stateName, geoUnit }) {
  return (
    <div className="flex h-full items-center justify-center px-8 text-center">
      <p className="font-sans text-xs leading-relaxed text-sable/70">
        No {geoUnit ?? "sub-state"} boundaries published for {stateName} yet.
      </p>
    </div>
  );
}

// Ordered (key, label) pairs for the "State context" list — the four
// access/funding variables from JHU's Legislation sheet that were requested
// early on (see running-notes.md, the "additional policy fields" ask) but
// never built anywhere, since the standalone Policy view they were floated
// for was deliberately never built either (too much for what it'd answer —
// see decisions.md 2026-07-09).
const STATE_CONTEXT_FIELDS = [
  ["sportsAccess", "Sports access"],
  ["courseAccess", "Course access"],
  ["extracurricularAccess", "Extracurriculars"],
  ["publicFunding", "Public funding"],
];

// Reuses SummaryCard's own "State context" list convention (eyebrow + a
// label/value row list) byte-for-byte — see RegulationCard's
// LegislationFacts — rather than inventing new styling for the same kind of
// content. A field with a `url` (only Georgia's, for now — illustrating
// where a real per-cell source link would go once this is a real loader,
// same as the Regulation heat map's links) renders as a link instead of
// plain text; everything else stays plain, matching how ReadMoreLink is the
// only other link in this whole headline.
function StateContextList({ context }) {
  if (!context) return null;
  return (
    <>
      <hr className={CARD_DIVIDER_CLASS} />
      <p className={CARD_EYEBROW_CLASS}>State context</p>
      <ul className={CARD_LIST_CLASS}>
        {STATE_CONTEXT_FIELDS.map(([key, label]) => {
          const field = context[key];
          if (!field) return null;
          return (
            <li key={key} className="flex items-baseline justify-between font-sans text-xs">
              <span className="text-sable/70">{label}</span>
              {field.url ? (
                <a
                  href={field.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-heritage underline-offset-4 hover:underline"
                >
                  {field.value}
                </a>
              ) : (
                <span className="font-semibold text-sable">{field.value}</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

// The state headline — plain typography beside the map, no border or
// background. Deliberately NOT a SummaryCard: this page's "detail" is a
// single sentence of context, not a multi-part stat card, so giving it a
// bordered box read as an empty imitation of the other tabs' cards rather
// than its own thing. Centers vertically against the map via the row's own
// lg:items-center (see the grid below) rather than stretching to fill it —
// there's no visible box here that would look broken if it didn't.
function ExplorerHeadline({ state, slug }) {
  return (
    <div>
      <h3 className="font-sans text-2xl font-bold text-sable">{state.name}</h3>

      <p className="mt-3 font-sans text-4xl font-bold leading-none text-sable">
        {formatNumber(state.total)}
      </p>
      <p className="mt-2 font-sans text-sm leading-relaxed text-sable">
        reported homeschool students, {state.year}
      </p>
      <p className="font-sans text-sm leading-relaxed text-sable/70">
        {state.geoUnit
          ? `${state.reporting} ${state.geoLabel} reporting.`
          : "No sub-state breakdown reported yet."}
      </p>

      <StateContextList context={state.context} />

      <div className="mt-4">
        <ReadMoreLink stateName={state.name} slug={slug} />
      </div>
    </div>
  );
}

// Sticky-header ranked table matching EnrollmentTable's exact conventions
// (uppercase sticky header, tabular-nums, subtle row borders) so the region
// list reads as the same kind of table as the rest of the app, not a
// one-off list.
const REGION_HEAD_CELL =
  "sticky top-0 z-10 h-7 bg-white px-3 border-b border-sable/15 font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70";

function RegionTable({ regions, unitLabel, height }) {
  return (
    <Table
      className="font-sans text-xs"
      containerStyle={{ height }}
      containerLabel={`Students by ${unitLabel}`}
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={`${REGION_HEAD_CELL} w-8 text-right`}>#</TableHead>
          <TableHead className={`${REGION_HEAD_CELL} text-left`}>{unitLabel}</TableHead>
          <TableHead className={`${REGION_HEAD_CELL} text-right`}>Students</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {regions.map((r, i) => (
          <TableRow key={r.name} className="border-b border-sable/10 hover:bg-transparent">
            <TableCell className="px-3 py-1.5 text-right tabular-nums text-[11px] text-sable/70">
              {i + 1}
            </TableCell>
            <TableCell className="px-3 py-1.5 font-medium text-sable">{r.name}</TableCell>
            <TableCell className="px-3 py-1.5 text-right tabular-nums text-sable">
              {r.value > 0 ? (
                formatNumber(r.value)
              ) : (
                <span className="text-sable/70">not reported</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Same-height filler for a data-zone slot with nothing to show — identical
// pattern to EnrollmentPanel's DataPlaceholder, kept local since this page's
// data zone isn't part of the shell's shared grid.
function DataPlaceholder({ height, children }) {
  return (
    <div
      className="flex items-center justify-center px-3 text-center font-sans text-xs text-sable/70"
      style={{ height }}
    >
      {children}
    </div>
  );
}

export default function StateExplorerPanel({ stateKey }) {
  const state = EXPLORER_STATES[stateKey];
  const demoKeys = Object.keys(state.demographics);

  // Not reset via useEffect on stateKey change — self-heals instead: if the
  // previously-picked category doesn't exist for the newly-selected state,
  // fall back to that state's first available category (or none).
  const [pickedDemo, setPickedDemo] = useState(demoKeys[0] ?? null);
  const activeDemo = demoKeys.includes(pickedDemo) ? pickedDemo : demoKeys[0] ?? null;

  // Quantile breaks over THIS state's own region values, shared by the map's
  // fill (fillForValue) and the legend's swatch range labels — computed once
  // here so the two can never drift apart, same reasoning as
  // buildEnrollmentDescriptor sharing one `breaks` between the national
  // map's fill and its legend.
  const regionBreaks = state.regions
    ? computeQuantileBreaks(state.regions.map((r) => r.value))
    : null;
  const legendSwatches = regionBreaks
    ? RAMP_STEPS.map((color, i) => ({
        color,
        label: rangeLabel(regionBreaks, i, RAMP_STEPS.length),
      }))
    : [];
  const slug = BY_NAME[state.name]?.slug ?? "";
  const unitLabel = state.geoUnit
    ? state.geoUnit[0].toUpperCase() + state.geoUnit.slice(1)
    : "Region";

  return (
    <div className="flex flex-col">
      {/* Row 1 — a fixed-aspect map slot (real map or a same-box "not
          published" placeholder) on the left, a plain-text headline on the
          right, vertically centered against the map rather than stretched
          to fill it. This row's height is set entirely by
          EXPLORER_MAP_VIEW_W/H, so it's identical no matter which state is
          selected — and identical to Enrollment/Regulation's own map row,
          since it's the same aspect ratio. */}
      <div className={`${TWO_COLUMN_GRID_CLASS} lg:items-center`}>
        <div>
          <div style={{ aspectRatio: `${EXPLORER_MAP_VIEW_W} / ${EXPLORER_MAP_VIEW_H}` }}>
            {state.hasRealGeo ? (
              <RegionMap stateKey={stateKey} regions={state.regions} breaks={regionBreaks} />
            ) : (
              <NoMapPlaceholder stateName={state.name} geoUnit={state.geoUnit} />
            )}
          </div>
          {state.hasRealGeo && (
            <div className="mt-4">
              <MapLegend label={`Students, ${state.year}`} swatches={legendSwatches} />
            </div>
          )}
        </div>

        <ExplorerHeadline state={state} slug={slug} />
      </div>

      {/* Row 2 — data zone: ranked region table left, demographic breakdown
          right, same shape (and same ENROLLMENT_TABLE_HEIGHT) as Enrollment's
          table/graph row. */}
      <div className={`mt-6 ${TWO_COLUMN_GRID_CLASS}`} style={{ minHeight: DATA_ZONE_MIN_HEIGHT }}>
        <div>
          <h2 className={SECTION_HEADING_CLASS}>
            Students by {state.geoUnit ?? "region"}, {state.year}
          </h2>
          <div className="mt-3">
            {state.regions ? (
              <RegionTable
                regions={state.regions}
                unitLabel={unitLabel}
                height={ENROLLMENT_TABLE_HEIGHT}
              />
            ) : (
              <DataPlaceholder height={ENROLLMENT_TABLE_HEIGHT}>
                {state.name} does not yet report a sub-state breakdown
                (county, district, or town).
              </DataPlaceholder>
            )}
          </div>
        </div>

        <div>
          {/* Category pills sit in the heading row, trailing — same spot
              ComparisonLegend occupies next to Enrollment's "Trends" heading. */}
          <div className="flex items-center justify-between gap-4">
            <h2 className={SECTION_HEADING_CLASS}>Reported subgroups</h2>
            {demoKeys.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2">
                {demoKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPickedDemo(key)}
                    className={`rounded-full px-3 py-1 font-sans text-xs font-medium capitalize transition-colors ${
                      activeDemo === key
                        ? "bg-heritage text-white"
                        : "border border-sable/20 text-sable/70 hover:border-sable/40 hover:text-sable"
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3" style={{ height: ENROLLMENT_TABLE_HEIGHT }}>
            {demoKeys.length === 0 ? (
              <DataPlaceholder height={ENROLLMENT_TABLE_HEIGHT}>
                {state.name} does not yet report a demographic breakdown.
              </DataPlaceholder>
            ) : (
              <div className="flex h-full flex-col justify-center gap-2.5 overflow-y-auto">
                {state.demographics[activeDemo].map((row, i) => {
                  const isOther = /other|not specified/i.test(row.label);
                  const color = isOther ? COLORS.nonReportingStripe : comparisonColor(i);
                  return (
                    <div
                      key={row.label}
                      className="grid grid-cols-[132px_1fr_38px] items-center gap-2.5"
                    >
                      <span className="font-sans text-xs leading-snug text-sable">
                        {row.label}
                      </span>
                      <div className="h-2 rounded-full bg-sable/5">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${row.pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-right font-sans text-xs tabular-nums text-sable/70">
                        {row.pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
