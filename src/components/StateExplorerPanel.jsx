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
 * breakdown, the same table+chart pairing shape Enrollment uses.
 *
 * Row 1 and row 2 hold a FIXED height regardless of which state is selected:
 * row 1 is pinned to EXPLORER_MAP_VIEW_W/H (a real map, or a same-box
 * placeholder when a state has no published boundaries — see
 * NoMapPlaceholder) — the SAME aspect ratio as the national ChoroplethMap, so
 * this row is also the same height as Enrollment/Regulation's map row; row 2
 * reuses ENROLLMENT_TABLE_HEIGHT directly. So switching states here — or
 * switching tabs entirely — never visibly resizes the page, and the whole
 * view stays inside the fixed-height iframe budget the rest of the tool is
 * built to.
 *
 * Georgia and Louisiana's sub-geography render as REAL county/district maps
 * (US Census boundaries — Georgia via us-atlas, Louisiana via Census/NCES
 * TIGER + mapshaper — fetched from public/state-explorer-geo/). Hawaii's real
 * district ("complex area") boundaries were checked and aren't published
 * federal geography, so it shows its real ranked list with no map rather than
 * a fabricated one.
 *
 * Regions are click-to-select and comparable, same spirit as the national
 * map's state cohort (click/keyboard select, dim + ring highlight on the map;
 * capped at COMPARE_CAP). Unlike the national map, there's no separate chip
 * row — an earlier pass tried a persistent full-width "Comparing" band
 * between row 1 and row 2 and Roy flagged it as actively confusing: it sat
 * directly above BOTH table columns, so it read as introducing the
 * demographics column too, even once that column's own content stopped
 * reacting to selection — the mere page POSITION implied a relationship that
 * doesn't exist (demographics is state-wide; region selection isn't). The
 * table already shows exactly what a chip row would (who's selected, via
 * pin-to-top + highlight), so instead: the table itself carries a compact
 * add/clear control in its own heading (RegionAddControl, below — reachable
 * before any click, same accessibility fix the chip-row attempt was after,
 * without needing the width a chip row does), and clicking a region's name
 * (a real `<button>` inside its cell, same pattern EnrollmentComparisonCard's
 * "View detail →" uses — not the `<tr>` itself, so table row/cell a11y
 * semantics stay intact) toggles it on/off, standing in for the chip's ✕.
 * The selection cohort (selectedRegions/onToggleRegion/onClearRegions) is
 * lifted to App.jsx, not owned here and not the app's cross-topic
 * SelectionProvider — a region name only means something within its own
 * state, so it stays a separate cohort from the national map's, but it does
 * need to live above this component so it survives switching away from the
 * State Explorer tab and back (this component unmounts on tab switch; the
 * lifted state above it doesn't).
 *
 * Demographics (row 2's right-hand slot) does NOT react to region selection
 * at all — no swap, no heading change. Earlier passes tried making it swap to
 * a region-comparison detail view, reasoning that slot would eventually hold
 * a per-region trend chart anyway; Roy cut that once the table already showed
 * the identical value+rank info (the swap was pure duplication with today's
 * single-year data) — the eventual trend chart is real future work, not a
 * reason to half-build a placeholder for it now.
 *
 * Known limitation, deliberately not solved yet: this whole mechanism (table
 * rows = individual regions, click a row's name to add/remove) assumes
 * TODAY's table shape. Once real per-county history lands, Roy's plan is for
 * this table to pivot to a year-by-year view (rows = years) for the selected
 * region(s) — at which point there's no per-region ROW left to click, and
 * "remove" will need to move to a per-column control instead (each selected
 * region as its own column, with a color dot matching its future trend line
 * and a way to drop it — much like the national comparison table/chips
 * already do). That's a real, known rework, but a narrow one: the MAP click,
 * the "+ add" combobox (RegionAddControl), and the underlying
 * selectedRegions state are already shape-agnostic — none of them assume
 * "one row per region" — only the table's click-to-remove affordance will
 * need to move. Not worth solving today against data that doesn't exist yet.
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
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover.jsx";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "./ui/command.jsx";
import {
  RAMP_STEPS,
  COLORS,
  comparisonColor,
  computeQuantileBreaks,
  rangeLabel,
  MAP_STROKE_REST,
  MAP_SELECTION_STROKE_WIDTH,
} from "../config/theme.js";
import { formatNumber } from "../lib/format.js";
import { buildStateProjection } from "../lib/geoProjection.js";
import { buildInteractionProps } from "../lib/mapInteraction.js";
import { BY_NAME } from "../config/states.js";
import { COMPARE_CAP } from "../config/selection.js";
import MapLegend from "./MapLegend.jsx";
import MapHoverGlow from "./MapHoverGlow.jsx";
import {
  ENROLLMENT_TABLE_HEIGHT,
  DATA_ZONE_MIN_HEIGHT,
  EXPLORER_MAP_VIEW_W,
  EXPLORER_MAP_VIEW_H,
  EXPLORER_LEGEND_SLOT_HEIGHT,
  TWO_COLUMN_GRID_CLASS,
} from "../config/layout.js";
import { EXPLORER_STATES, valueForYear } from "../data/stateExplorerMockData.js";

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

// Plural form of a geo unit noun for combobox/empty-state copy — not a
// trivial `+s` (county -> counties). Falls back to a naive `+s` for any
// future geoUnit this list doesn't cover yet.
const GEO_UNIT_PLURAL = { county: "counties", district: "districts" };
function geoUnitPlural(geoUnit) {
  return GEO_UNIT_PLURAL[geoUnit] ?? `${geoUnit}s`;
}

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
// at the exact same footprint. Click/keyboard select + the dim/ring selection
// visual are ported from ChoroplethMap (buildInteractionProps, the
// .map-base--has-selection + overlay-ring pattern) rather than reinvented —
// see StateExplorerPanel's own doc comment above for why this exists now.
function RegionMap({ stateKey, regions, breaks, selectedRegions, onToggleRegion, unitLabel }) {
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

  // Canonical mock-data name for a topo feature's (lowercased) name — the
  // identity the map, RegionTable, and the comparison list all key selection
  // off, since the topo file's `properties.name` and the mock data's `name`
  // aren't guaranteed to match in case, only in lowercase form (same
  // assumption valueByName above already relies on). Falls back to the topo's
  // own name for the handful of real counties/districts with no matching mock
  // entry (e.g. Georgia's 3 unmatched counties) — still selectable, just with
  // no value.
  const regionByLower = useMemo(() => {
    const map = new Map();
    for (const r of regions) map.set(r.name.toLowerCase(), r.name);
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

  // Resolved once per feature (name + value) so the base layer and the
  // selection overlay below can never disagree on a region's identity. They
  // used to each call regionByLower.get(...) independently; the overlay's
  // copy was missing the `?? f.properties?.name` fallback the base layer
  // relies on, so a county/district with no matching mock entry (an
  // unmatched name resolves to undefined there instead of the topo name)
  // would dim correctly but never get its selection ring — same class of bug
  // this single resolution step now rules out entirely. Kept ABOVE the
  // loading-state early return below (unlike a first pass at this fix) —
  // every hook in a component must run on every render regardless of early
  // returns, or React throws (violates the Rules of Hooks: the geo-not-ready
  // render would call fewer hooks than the geo-ready one).
  const resolvedFeatures = useMemo(() => {
    if (!geo) return [];
    return geo.features.map((f) => {
      const lower = f.properties?.name?.toLowerCase();
      return {
        feature: f,
        name: regionByLower.get(lower) ?? f.properties?.name,
        value: valueByName.get(lower) ?? null,
      };
    });
  }, [geo, regionByLower, valueByName]);

  if (!geo || !projected) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-sable/70">
        Loading map…
      </div>
    );
  }

  const { path } = projected;
  const hasSelection = selectedRegions.length > 0;

  return (
    <svg
      viewBox={`0 0 ${EXPLORER_MAP_VIEW_W} ${EXPLORER_MAP_VIEW_H}`}
      role="group"
      aria-label={`${stateKey} map by ${unitLabel} — click or use Tab to select a ${unitLabel}`}
      className="block h-full w-full"
    >
      <defs>
        <MapHoverGlow />
      </defs>

      {/* Base layer: every region rendered once, dimmed as a group once
          anything is selected (map-base--has-selection, same global CSS rule
          the national map uses) — see index.css. */}
      <g className={hasSelection ? "map-base--has-selection" : ""}>
        {resolvedFeatures.map(({ feature: f, name, value }) => {
          const isSelected = selectedRegions.includes(name);
          const className = `state-path state-path--clickable${
            isSelected ? " state-path--selected" : ""
          }`;
          return (
            <path
              key={f.id}
              d={path(f)}
              className={className}
              fill={fillForValue(value, breaks)}
              stroke="#fff"
              strokeWidth={MAP_STROKE_REST}
              {...buildInteractionProps({
                name,
                isSelected,
                isInteractive: () => true,
                onSelect: onToggleRegion,
                ariaLabelForState: () =>
                  value != null ? `${name}: ${formatNumber(value)}` : name,
              })}
            >
              <title>
                {f.properties?.name}
                {value != null ? `: ${formatNumber(value)}` : ""}
              </title>
            </path>
          );
        })}
      </g>

      {/* Selection overlay: each selected region redrawn on top with a single
          crisp ring, so its border can't be clipped by a neighbor drawn later
          in the base layer — same technique as ChoroplethMap. */}
      <g style={{ pointerEvents: "none" }}>
        {resolvedFeatures
          .filter(({ name }) => selectedRegions.includes(name))
          .map(({ feature: f, value }) => (
            <path
              key={f.id}
              d={path(f)}
              fill={fillForValue(value, breaks)}
              stroke={COLORS.sable}
              strokeWidth={MAP_SELECTION_STROKE_WIDTH}
              strokeLinejoin="round"
            />
          ))}
      </g>
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

function RegionTable({ regions, unitLabel, height, selectedRegions = [], onToggleRegion }) {
  // Selected regions pinned to the top so comparing several doesn't require
  // scrolling to find them, but each row keeps its TRUE state-wide rank (the
  // "#" column) rather than being renumbered by its new position — this is a
  // regroup, not a re-rank. `regions` arrives pre-sorted by value descending
  // (see stateExplorerMockData.js), so the original index is the real rank.
  const ranked = useMemo(() => regions.map((r, i) => ({ ...r, rank: i + 1 })), [regions]);
  const ordered = useMemo(() => {
    if (selectedRegions.length === 0) return ranked;
    const selected = ranked.filter((r) => selectedRegions.includes(r.name));
    const rest = ranked.filter((r) => !selectedRegions.includes(r.name));
    // A selected name with no matching row at all (a real county/district the
    // map has a shape for, but the mock data never had an entry for — e.g.
    // Georgia's 3 unmatched counties) would otherwise vanish from the table
    // entirely, looking like the click did nothing. Surface it explicitly
    // instead, pinned alongside the rest of the selection.
    const matchedNames = new Set(selected.map((r) => r.name));
    const unmatched = selectedRegions
      .filter((name) => !matchedNames.has(name))
      .map((name) => ({ name, value: null, rank: null }));
    return [...selected, ...unmatched, ...rest];
  }, [ranked, selectedRegions]);

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
        {ordered.map((r) => {
          const isSelected = selectedRegions.includes(r.name);
          // Hover must match the resting state exactly (transparent for a
          // plain row, the same tint for a selected one) — a first pass used
          // `hover:bg-transparent` unconditionally, which is right for plain
          // rows but for a selected row meant hovering it MOMENTARILY ERASED
          // its own tint (the shared TableRow's default hover class is a
          // different color, and `hover:bg-transparent` doesn't know to
          // preserve `bg-heritage/5` underneath it). That flicker read as a
          // click affordance on rows that aren't actually interactive.
          const rowClassName = isSelected
            ? "border-b border-sable/10 bg-heritage/5 font-semibold hover:bg-heritage/5"
            : "border-b border-sable/10 hover:bg-transparent";
          return (
            <TableRow key={r.name} className={rowClassName}>
              <TableCell className="px-3 py-1.5 text-right tabular-nums text-[11px] text-sable/70">
                {r.rank ?? "—"}
              </TableCell>
              <TableCell className="px-3 py-1.5 font-medium text-sable">
                {/* A real <button>, not the <tr> itself, so the table's
                    row/cell semantics stay intact for assistive tech — same
                    pattern EnrollmentComparisonCard's "View detail →" uses
                    for a per-row action. Click toggles selection on/off,
                    standing in for a chip's ✕ now that there's no chip row. */}
                <button
                  type="button"
                  onClick={() => onToggleRegion(r.name)}
                  aria-pressed={isSelected}
                  className="text-left decoration-sable/40 underline-offset-2 hover:underline"
                >
                  {r.name}
                </button>
              </TableCell>
              <TableCell className="px-3 py-1.5 text-right tabular-nums text-sable">
                {r.value > 0 ? (
                  formatNumber(r.value)
                ) : (
                  <span className="text-sable/70">not reported</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
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

// Compact add/clear control for the table's own heading — the region
// equivalent of ComparingChips' add-combobox, but without chips: the table
// already shows who's selected (pinned to top, highlighted), so a second
// "who's selected" display would be redundant. Always rendered (not gated on
// any selection existing) so it's reachable before a first click, same
// reasoning as the national map's always-visible "+ add state".
function RegionAddControl({ selectedCount, availableItems, valueByName, onAdd, onClear, itemNounSingular, itemNounPlural }) {
  const atCap = selectedCount >= COMPARE_CAP;
  return (
    <div className="flex items-center gap-3">
      {!atCap && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-full border border-dashed border-sable/30 px-3 py-1 font-sans text-xs text-sable/70 transition-colors hover:border-sable/50 hover:text-sable"
            >
              + add {itemNounSingular}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0">
            <Command>
              <CommandInput placeholder={`Search ${itemNounPlural}…`} />
              <CommandList>
                <CommandEmpty>No {itemNounPlural} found.</CommandEmpty>
                {availableItems.map((name) => {
                  const v = valueByName.get(name);
                  return (
                    <CommandItem key={name} value={name} onSelect={() => onAdd(name)}>
                      <span className="flex-1">{name}</span>
                      <span className="font-sans text-xs tabular-nums text-sable/70">
                        {v > 0 ? formatNumber(v) : "not reported"}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      <span className="font-sans text-xs tabular-nums text-sable/70">
        {selectedCount} / {COMPARE_CAP}
      </span>
      {selectedCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="font-sans text-xs text-sable/70 underline decoration-dashed decoration-sable/30 underline-offset-4 transition-colors hover:text-sable hover:decoration-sable/60"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export default function StateExplorerPanel({
  stateKey,
  selectedRegions,
  onToggleRegion,
  onClearRegions,
}) {
  const state = EXPLORER_STATES[stateKey];
  const demoKeys = Object.keys(state.demographics);

  // Not reset via useEffect on stateKey change — self-heals instead: if the
  // previously-picked category doesn't exist for the newly-selected state,
  // fall back to that state's first available category (or none).
  const [pickedDemo, setPickedDemo] = useState(demoKeys[0] ?? null);
  const activeDemo = demoKeys.includes(pickedDemo) ? pickedDemo : demoKeys[0] ?? null;

  // Resolves each region's year-keyed `values` down to a flat value for THIS
  // state's active year — the one seam that knows about the multi-year shape.
  // RegionMap/RegionTable/RegionComparisonList all consume this flat form, so
  // adding a year selector later only changes what's passed here, not those
  // components.
  const regionsForDisplay = useMemo(
    () =>
      state.regions?.map((r) => ({
        name: r.name,
        value: valueForYear(r, state.year),
      })) ?? null,
    [state.regions, state.year],
  );

  // Quantile breaks over THIS state's own region values, shared by the map's
  // fill (fillForValue) and the legend's swatch range labels — computed once
  // here so the two can never drift apart, same reasoning as
  // buildEnrollmentDescriptor sharing one `breaks` between the national
  // map's fill and its legend.
  const regionBreaks = regionsForDisplay
    ? computeQuantileBreaks(regionsForDisplay.map((r) => r.value))
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

  // Regions still available to add via the table's add-combobox.
  const availableRegionNames = useMemo(
    () =>
      (regionsForDisplay ?? [])
        .map((r) => r.name)
        .filter((name) => !selectedRegions.includes(name))
        .sort((a, b) => a.localeCompare(b)),
    [regionsForDisplay, selectedRegions],
  );
  const valueByRegionName = useMemo(
    () => new Map((regionsForDisplay ?? []).map((r) => [r.name, r.value])),
    [regionsForDisplay],
  );

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
              <RegionMap
                stateKey={stateKey}
                regions={regionsForDisplay}
                breaks={regionBreaks}
                selectedRegions={selectedRegions}
                onToggleRegion={onToggleRegion}
                unitLabel={unitLabel.toLowerCase()}
              />
            ) : (
              <NoMapPlaceholder stateName={state.name} geoUnit={state.geoUnit} />
            )}
          </div>
          {/* Always reserved (see EXPLORER_LEGEND_SLOT_HEIGHT) so row 1 is the
              same height whether this state has a real map or not. */}
          <div className="mt-4" style={{ height: EXPLORER_LEGEND_SLOT_HEIGHT }}>
            {state.hasRealGeo && (
              <MapLegend label={`Students, ${state.year}`} swatches={legendSwatches} />
            )}
          </div>
        </div>

        <ExplorerHeadline state={state} slug={slug} />
      </div>

      {/* Row 2 — data zone: ranked region table left, demographic breakdown
          right, same shape (and same ENROLLMENT_TABLE_HEIGHT) as Enrollment's
          table/graph row. */}
      <div className={`mt-6 ${TWO_COLUMN_GRID_CLASS}`} style={{ minHeight: DATA_ZONE_MIN_HEIGHT }}>
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className={SECTION_HEADING_CLASS}>
              Students by {state.geoUnit ?? "region"}, {state.year}
            </h2>
            {/* Always rendered when this state has regions at all (not
                gated on a selection existing) — reachable before any click,
                same reasoning as the national map's always-visible
                "+ add state". No chips here: the table itself already shows
                who's selected (pinned to top, highlighted), so this control
                only needs to add/clear, not redisplay the selection. */}
            {regionsForDisplay && (
              <RegionAddControl
                selectedCount={selectedRegions.length}
                availableItems={availableRegionNames}
                valueByName={valueByRegionName}
                onAdd={onToggleRegion}
                onClear={onClearRegions}
                itemNounSingular={state.geoUnit ?? "region"}
                itemNounPlural={geoUnitPlural(state.geoUnit ?? "region")}
              />
            )}
          </div>
          <div className="mt-3">
            {regionsForDisplay ? (
              <RegionTable
                regions={regionsForDisplay}
                unitLabel={unitLabel}
                height={ENROLLMENT_TABLE_HEIGHT}
                selectedRegions={selectedRegions}
                onToggleRegion={onToggleRegion}
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
          {/* Demographics — completely inert to region selection (see the
              file header doc comment for why: the table already shows
              value+rank for whatever's selected, so a swap here would just
              duplicate it with today's single-year data; a real per-region
              trend chart is the honest thing to build here once historical
              data exists, not before). */}
          <div className="flex items-center justify-between gap-4">
            <h2 className={SECTION_HEADING_CLASS}>Reported subgroups</h2>
            {/* Category pills sit in the heading row, trailing — same spot
                ComparisonLegend occupies next to Enrollment's "Trends"
                heading. */}
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
