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
 * Demographics (row 2's right-hand slot) is state-wide and doesn't react to
 * region selection — but the SLOT itself does: 1+ regions selected swaps it
 * entirely to a multi-year trend chart for the selected region(s) (real
 * per-county/district history landed 2026-10, see decisions.md), reusing
 * Enrollment's ComparisonTrend/ComparisonLegend (generalized to take a
 * `labelForItem`/`formatYear` instead of assuming states — see those files).
 * A single selected region still uses ComparisonTrend rather than a separate
 * single-series chart: its shared-y-domain fitting is a no-op with only one
 * series, so there's nothing a dedicated one-line chart would do differently.
 *
 * The region TABLE deliberately does NOT pivot to a year-by-year shape for
 * this — an earlier plan floated that (rows=years, one column per selected
 * region, mirroring the national comparison table), but county/district names
 * have no postal-code-length equivalent, so that shape would need the
 * longest real names as repeated column headers. The table keeps today's
 * shape (rows=regions, ranked for the active year) instead — it already
 * tells you magnitude+rank for whatever's selected; the new chart tells you
 * shape over time. Click a region's name to add/remove still works exactly
 * as before; no affordance migration needed.
 */

import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import { ChevronDown } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.jsx";
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
  REGION_DIM_OPACITY,
  stateExplorerCitation,
} from "../config/theme.js";
import { formatNumber, shortRegionLabel } from "../lib/format.js";
import { buildStateProjection } from "../lib/geoProjection.js";
import { buildInteractionProps } from "../lib/mapInteraction.js";
import { usePngExport } from "../lib/usePngExport.js";
import { BY_NAME } from "../config/states.js";
import { COMPARE_CAP } from "../config/selection.js";
import { GEO_FILE_BY_STATE } from "../config/stateExplorerCoverage.js";
import MapLegend from "./MapLegend.jsx";
import MapHoverGlow from "./MapHoverGlow.jsx";
import ComparisonTrend from "./ComparisonTrend.jsx";
import ComparisonLegend from "./ComparisonLegend.jsx";
import ChartExportCard from "./ChartExportCard.jsx";
import DownloadPngButton from "./DownloadPngButton.jsx";
import {
  ENROLLMENT_TABLE_HEIGHT,
  DATA_ZONE_MIN_HEIGHT,
  EXPLORER_MAP_VIEW_W,
  EXPLORER_MAP_VIEW_H,
  EXPLORER_LEGEND_SLOT_HEIGHT,
  EXPLORER_CONTEXT_SLOT_HEIGHT,
  TWO_COLUMN_GRID_CLASS,
} from "../config/layout.js";
import { valueForYear, codeForYear } from "../data/stateExplorerMockData.js";

// Section-heading convention shared by Enrollment/Regulation's data-zone
// headings (see EnrollmentPanel.jsx) — kept local here since this page's data
// zone isn't part of the shell's shared grid.
const SECTION_HEADING_CLASS =
  "font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70";

// Real per-state boundary files, fetched once and cached module-level
// (survives remounts/tab switches) — mirrors ChoroplethMap's national-map
// fetch pattern. Lives in config/stateExplorerCoverage.js (not owned here)
// so Enrollment/Regulation's cross-link can check state coverage without
// pulling in this component. A state present in the snapshot but missing
// from that list silently shows whichever OTHER state's map was fetched
// last (this component stays mounted across state switches; the fetch for a
// missing filename fails with no .catch(), so `topo` never updates) rather
// than erroring — caught live for Maine, 2026-10-07.
const geoFileByState = GEO_FILE_BY_STATE;
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
function RegionMap({
  stateKey,
  regions,
  breaks,
  selectedRegions,
  onToggleRegion,
  unitLabel,
  // Suffix for the shared <defs> hover-glow filter id — mirrors
  // ChoroplethMap's own idPrefix (see that file's doc comment). Default ""
  // keeps the canonical id the live map's CSS hover rule references; the
  // off-screen PNG-export copy passes a unique prefix so its own filter def
  // can't collide with the live map's.
  idPrefix = "",
}) {
  const hoverGlowId = `state-hover-glow${idPrefix}`;
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

  // Verbatim suppression code (e.g. "<10") for a region with no real number
  // this year — read alongside valueByName so the map's accessible name can
  // say "masked" instead of implying the region simply didn't report.
  const codeByName = useMemo(() => {
    const map = new Map();
    for (const r of regions) map.set(r.name.toLowerCase(), r.code);
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
  // `d` (the SVG path string) is resolved here too, not inline in the render
  // below — it used to be recomputed by calling `path(f)` fresh on every
  // single render for every feature, which is real work (full geometry-to-
  // string serialization) for a state with hundreds of regions (New York's
  // 680). Clicking to select a region changes `selectedRegions`, which
  // re-renders this component but doesn't change any feature's geometry —
  // so the string only needs computing once per feature, not once per
  // feature per click. Caught as the likely cause of New York staying
  // "unusably slow" even after simplifying file size; see decisions.md
  // (2026-10-06).
  const resolvedFeatures = useMemo(() => {
    if (!geo || !projected) return [];
    const { path } = projected;
    return geo.features.map((f) => {
      const lower = f.properties?.name?.toLowerCase();
      return {
        feature: f,
        name: regionByLower.get(lower) ?? f.properties?.name,
        value: valueByName.get(lower) ?? null,
        code: codeByName.get(lower) ?? null,
        d: path(f),
      };
    });
  }, [geo, projected, regionByLower, valueByName, codeByName]);

  if (!geo || !projected) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-sable/70">
        Loading map…
      </div>
    );
  }

  const hasSelection = selectedRegions.length > 0;

  return (
    <svg
      viewBox={`0 0 ${EXPLORER_MAP_VIEW_W} ${EXPLORER_MAP_VIEW_H}`}
      role="group"
      aria-label={`${stateKey} map by ${unitLabel} — click or use Tab to select a ${unitLabel}`}
      // h-auto (not h-full): sizes off the viewBox's own intrinsic ratio,
      // same technique ChoroplethMap uses, rather than depending on an
      // ancestor's CSS aspect-ratio to supply a definite height. That
      // dependency is what broke the PNG export — html-to-image's cloned
      // snapshot didn't reliably re-resolve the ancestor's aspect-ratio-
      // derived height, so the off-screen copy's map collapsed to zero
      // height and exported blank. h-auto needs no ancestor cooperation at
      // all. Harmless live too: the row 1 wrapper's own aspect-ratio uses
      // the identical EXPLORER_MAP_VIEW_W/H ratio, so nothing visually
      // changes there.
      className="block h-auto w-full"
    >
      <defs>
        <MapHoverGlow id={hoverGlowId} />
      </defs>

      {/* Base layer: every region rendered once. Dimming when something's
          selected is NOT done per-path here (unlike the national map) — see
          the single overlay rect below instead, and index.css's
          .region-dim-overlay comment for why. */}
      <g>
        {resolvedFeatures.map(({ feature: f, name, value, code, d }) => {
          const isSelected = selectedRegions.includes(name);
          const className = `state-path state-path--clickable${
            isSelected ? " state-path--selected" : ""
          }`;
          const valueLabel = value != null ? formatNumber(value) : code;
          return (
            <path
              key={f.id}
              d={d}
              className={className}
              fill={fillForValue(value, breaks)}
              stroke="#fff"
              strokeWidth={MAP_STROKE_REST}
              {...buildInteractionProps({
                name,
                isSelected,
                isInteractive: () => true,
                onSelect: onToggleRegion,
                ariaLabelForState: () => (valueLabel ? `${name}: ${valueLabel}` : name),
              })}
            >
              <title>
                {f.properties?.name}
                {valueLabel ? `: ${valueLabel}` : ""}
              </title>
            </path>
          );
        })}
      </g>

      {/* Single dim overlay standing in for per-path opacity — see
          index.css's .region-dim-overlay comment. Sits above the base layer
          (dimming everything, selected regions included) but below the
          selection-ring overlay next, which redraws selected regions back
          at full strength on top. Opacity is an inline style, not just the
          --active class — see REGION_DIM_OPACITY's own comment for why
          (the PNG export needs it). */}
      <rect
        x={0}
        y={0}
        width={EXPLORER_MAP_VIEW_W}
        height={EXPLORER_MAP_VIEW_H}
        fill="white"
        pointerEvents="none"
        className="region-dim-overlay"
        style={{ opacity: hasSelection ? REGION_DIM_OPACITY : 0 }}
      />

      {/* Selection overlay: each selected region redrawn on top with a single
          crisp ring, so its border can't be clipped by a neighbor drawn later
          in the base layer — same technique as ChoroplethMap. */}
      <g style={{ pointerEvents: "none" }}>
        {resolvedFeatures
          .filter(({ name }) => selectedRegions.includes(name))
          .map(({ feature: f, value, d }) => (
            <path
              key={f.id}
              d={d}
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
// see decisions.md 2026-07-09). Values come via regulationLoader.js (same
// Legislation sheet the Regulation view reads), merged in per state by
// stateExplorerLoader.js.
const STATE_CONTEXT_FIELDS = [
  ["sportsAccess", "Sports access"],
  ["courseAccess", "Course access"],
  ["extracurricularAccess", "Extracurriculars"],
  ["publicFunding", "Public funding"],
];

// Reuses SummaryCard's own "State context" list convention (eyebrow + a
// label/value row list) byte-for-byte — see RegulationCard's
// LegislationFacts — rather than inventing new styling for the same kind of
// content. A field with a `url` (a real per-cell source link off the
// Legislation sheet, same as the Regulation heat map's links) renders as a
// link instead of plain text; a field with no sourced link stays plain,
// matching how ReadMoreLink is the only other link in this whole headline.
function StateContextList({ context }) {
  // Reserves EXPLORER_CONTEXT_SLOT_HEIGHT whether or not this state has
  // context data — most states don't (see the constant's own comment) —
  // so the headline's total height, and therefore its centered position
  // against the map, doesn't shift when switching to/from one that does.
  if (!context) return <div style={{ minHeight: EXPLORER_CONTEXT_SLOT_HEIGHT }} />;
  return (
    <div style={{ minHeight: EXPLORER_CONTEXT_SLOT_HEIGHT }}>
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
    </div>
  );
}

// The state headline — plain typography beside the map, no border or
// background. Deliberately NOT a SummaryCard: this page's "detail" is a
// single sentence of context, not a multi-part stat card, so giving it a
// bordered box read as an empty imitation of the other tabs' cards rather
// than its own thing. Centers vertically against the map via the row's own
// lg:items-center (see the grid below) rather than stretching to fill it —
// there's no visible box here that would look broken if it didn't.
function ExplorerHeadline({
  state,
  slug,
  displayTotal,
  activeYear,
  availableYears,
  onPickYear,
}) {
  return (
    <div>
      <h3 className="font-sans text-2xl font-bold text-sable">{state.name}</h3>

      <p className="mt-3 font-sans text-4xl font-bold leading-none text-sable">
        {formatNumber(displayTotal)}
      </p>
      <p className="mt-2 font-sans text-sm leading-relaxed text-sable">
        reported homeschool students,{" "}
        {availableYears.length > 1 ? (
          <Select value={activeYear} onValueChange={onPickYear}>
            <SelectTrigger
              aria-label="Choose a year"
              className="inline-flex h-auto w-auto gap-0.5 border-none p-0 font-sans text-sm text-sable underline decoration-sable/40 underline-offset-2 hover:decoration-sable/70 focus:ring-0"
            >
              <SelectValue />
              <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
            </SelectTrigger>
            <SelectContent align="start">
              {availableYears.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          activeYear
        )}
      </p>
      <p className="font-sans text-sm leading-relaxed text-sable/70">
        {state.geoUnit
          ? // reportingByYear tracks the year selector; state.reporting (the
            // snapshot's default/latest-year string) is the fallback for any
            // hand-entered state that predates that field.
            `${state.reportingByYear?.[activeYear] ?? state.reporting} ${state.geoLabel} reporting.`
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
  // Re-sorts by value on every render rather than trusting incoming order:
  // `regions` is only pre-sorted for ONE year (whichever was latest when the
  // snapshot was built — see stateExplorerMockData.js / the build script),
  // so once the year selector can show an older year, that fixed order would
  // silently mislabel #1 for any year where the ranking actually differs.
  // Nulls (not reported) sort last, same as a real 0 would.
  const ranked = useMemo(
    () =>
      [...regions]
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [regions],
  );
  // Selected regions pinned to the top so comparing several doesn't require
  // scrolling to find them, but each row keeps its rank from above (the "#"
  // column) rather than being renumbered by its new position — this is a
  // regroup, not a re-rank.
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
      className="table-fixed font-sans text-xs"
      containerStyle={{ height }}
      containerLabel={`Students by ${unitLabel}`}
    >
      {/* Explicit widths on every column (not just "#") — table-auto sizes
          each column to its widest cell, so without this the name/Students
          columns quietly shifted a few px between states depending on each
          state's longest name or largest number (e.g. Minnesota vs.
          Colorado). table-fixed + widths here makes every state identical. */}
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={`${REGION_HEAD_CELL} w-8 text-right`}>#</TableHead>
          <TableHead className={`${REGION_HEAD_CELL} text-left`}>{unitLabel}</TableHead>
          <TableHead className={`${REGION_HEAD_CELL} w-20 text-right`}>Students</TableHead>
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
              <TableCell className="max-w-0 px-3 py-1.5 font-medium text-sable">
                {/* A real <button>, not the <tr> itself, so the table's
                    row/cell semantics stay intact for assistive tech — same
                    pattern EnrollmentComparisonCard's "View detail →" uses
                    for a per-row action. Click toggles selection on/off,
                    standing in for a chip's ✕ now that there's no chip row.
                    truncate + title: table-fixed gives this column a fixed
                    width, so a long real name (e.g. "Gallup-McKinley County
                    Schools") needs to clip with an ellipsis instead of
                    forcing the row to wrap or the column to grow. */}
                <button
                  type="button"
                  onClick={() => onToggleRegion(r.name)}
                  aria-pressed={isSelected}
                  title={r.name}
                  className="block w-full truncate text-left decoration-sable/40 underline-offset-2 hover:underline"
                >
                  {r.name}
                </button>
              </TableCell>
              <TableCell className="px-3 py-1.5 text-right tabular-nums text-sable">
                {r.value != null ? (
                  formatNumber(r.value)
                ) : r.code ? (
                  // The raw sheet has a real row for this region, but a code
                  // instead of a count (e.g. "<10") — shown verbatim rather
                  // than folded into the same dash a plain unmatched/
                  // non-reporting region gets. Who applied the code and what
                  // exactly it means isn't confirmed, so no tooltip guesses.
                  <span>{r.code}</span>
                ) : (
                  // "—" not "not reported": the fixed-width Students column
                  // (see table-fixed above) wrapped that phrase to two lines.
                  <span className="text-sable/70" title="Not reported">
                    —
                  </span>
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
                  const entry = valueByName.get(name);
                  return (
                    <CommandItem key={name} value={name} onSelect={() => onAdd(name)}>
                      <span className="flex-1">{name}</span>
                      <span className="font-sans text-xs tabular-nums text-sable/70">
                        {entry?.value != null
                          ? formatNumber(entry.value)
                          : entry?.code ?? "not reported"}
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
  states,
  stateKey,
  selectedRegions,
  onToggleRegion,
  onClearRegions,
}) {
  const state = states[stateKey];

  // Every year that appears in ANY region's `values` for this state, plus
  // state.year itself (covers the no-regions case, e.g. Delaware). Self-heals
  // on state switch — a state that doesn't have the previously-picked year
  // falls back to its own latest year rather than erroring.
  const availableYears = useMemo(() => {
    const years = new Set([state.year]);
    for (const r of state.regions ?? []) {
      for (const y of Object.keys(r.values)) years.add(y);
      for (const y of Object.keys(r.codes ?? {})) years.add(y);
    }
    return [...years].sort();
  }, [state.regions, state.year]);
  const [pickedYear, setPickedYear] = useState(state.year);
  const activeYear = availableYears.includes(pickedYear) ? pickedYear : state.year;

  // Demographics are extracted per year at build time — not every year has
  // any (a year with no grade/gender/race columns populated anywhere in its
  // rows extracts to {}). `demographicsByYear` is the real per-year map;
  // `state.demographics` (the old single/default-year field) is the fallback
  // for a hand-entered state that predates it (e.g. Delaware).
  const demographicsForYear =
    state.demographicsByYear?.[activeYear] ??
    (activeYear === state.year ? state.demographics : {});
  const demoKeys = Object.keys(demographicsForYear);
  // Distinguishes "this state never reports demographics" from "this
  // particular year doesn't have any" — the empty-state copy below reads
  // very differently for the two.
  const hasDemographicsAnyYear = Object.keys(state.demographicsByYear ?? {}).length > 0;

  // Not reset via useEffect on stateKey/year change — self-heals instead: if
  // the previously-picked category doesn't exist for the newly-active
  // state/year, fall back to the first available category for it (or none).
  const [pickedDemo, setPickedDemo] = useState(demoKeys[0] ?? null);
  const activeDemo = demoKeys.includes(pickedDemo) ? pickedDemo : demoKeys[0] ?? null;

  // This was the one seam the multi-year `values` shape was always built
  // for (see valueForYear's own doc comment) — RegionMap/RegionTable both
  // already just consume whatever flat value shows up here, no changes
  // needed there to support picking an older year.
  const regionsForDisplay = useMemo(
    () =>
      state.regions?.map((r) => ({
        name: r.name,
        value: valueForYear(r, activeYear),
        // Verbatim suppression code (e.g. "<10") for a region JHU reported
        // but masked — null for a real number and for a plain unmatched gap
        // alike, so those two keep reading as "—" same as before.
        code: codeForYear(r, activeYear),
      })) ?? null,
    [state.regions, activeYear],
  );

  // Headline number for the active year. state.total is the TRUE verified
  // total (matches JHU's own published figures) but only FOR state.year —
  // stepping to an older year falls back to summing this state's own
  // regions for that year, a real but partial number (same "floor, not
  // ceiling" caveat Georgia's county-matched total already carries) rather
  // than a second real total this snapshot doesn't store per year.
  const displayTotal =
    activeYear === state.year
      ? state.total
      : (regionsForDisplay?.reduce((sum, r) => sum + (r.value ?? 0), 0) ?? state.total);

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
    () => new Map((regionsForDisplay ?? []).map((r) => [r.name, { value: r.value, code: r.code }])),
    [regionsForDisplay],
  );

  // Trend mode: 1+ regions selected replaces the demographic breakdown with
  // each selected region's own multi-year history — same shape as
  // Enrollment's single-state Sparkline / multi-state ComparisonTrend split,
  // but unified into one component since a single selected region is just a
  // one-line case of the same shared-y-domain chart (see ComparisonTrend;
  // nothing about its domain-fitting logic depends on there being 2+ lines).
  const isTrending = selectedRegions.length > 0;

  // Each selected region's line/chip color, by selection order — same
  // comparisonColor sequence Enrollment's states use.
  const colorForRegion = (name) => comparisonColor(selectedRegions.indexOf(name));

  // Trend highlight (hover previews, click pins), lifted the same way
  // EnrollmentPanel lifts hoveredState/pinnedState so the legend and the
  // chart stay in lockstep.
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [pinnedRegion, setPinnedRegion] = useState(null);
  const rawRegionHighlight = hoveredRegion ?? pinnedRegion;
  const highlightedRegion = selectedRegions.includes(rawRegionHighlight)
    ? rawRegionHighlight
    : null;
  const toggleRegionPin = (name) =>
    setPinnedRegion((prev) => (prev === name ? null : name));

  // Years×regions series for the trend chart: one row per year this state has
  // ANY data for, with a value per selected region (null where that region
  // has a gap that year — same "gaps break a line" rule as Enrollment).
  // `availableYears` holds label strings (e.g. "2024–25"), not raw fall
  // years, so the chart's numeric x-axis needs the leading-4-digits number;
  // `yearByNumber` reverses that for formatYear, so axis ticks/the selected-
  // year guide line show State Explorer's own label format, not Enrollment's.
  const regionsByName = useMemo(
    () => new Map((state.regions ?? []).map((r) => [r.name, r])),
    [state.regions],
  );
  const yearByNumber = useMemo(
    () => new Map(availableYears.map((label) => [parseInt(label, 10), label])),
    [availableYears],
  );
  const trendRows = useMemo(
    () =>
      availableYears.map((label) => {
        const row = { year: parseInt(label, 10) };
        selectedRegions.forEach((name) => {
          const region = regionsByName.get(name);
          row[name] = region ? valueForYear(region, label) : null;
        });
        return row;
      }),
    [availableYears, selectedRegions, regionsByName],
  );

  // PNG export — same mechanism as Enrollment's map/chart downloads
  // (usePngExport + an off-screen ChartExportCard), just two independent
  // triggers here since the map and the trend chart are separate artifacts a
  // user might want on their own. Filenames keyed to the state so a batch of
  // downloads across states doesn't overwrite itself.
  const stateSlug = stateKey.toLowerCase();
  const {
    exportRef: mapExportRef,
    pending: mapExportPending,
    startExport: startMapExport,
  } = usePngExport("svg .state-path", `state-explorer-${stateSlug}-map.png`);
  const {
    exportRef: trendExportRef,
    pending: trendExportPending,
    startExport: startTrendExport,
  } = usePngExport(
    "svg .recharts-line-curve",
    `state-explorer-${stateSlug}-trends.png`,
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
              <MapLegend
                label={`Students, ${activeYear}`}
                swatches={legendSwatches}
                trailing={<DownloadPngButton onClick={startMapExport} />}
              />
            )}
          </div>
        </div>

        <ExplorerHeadline
          state={state}
          slug={slug}
          displayTotal={displayTotal}
          activeYear={activeYear}
          availableYears={availableYears}
          onPickYear={setPickedYear}
        />
      </div>

      {/* Row 2 — data zone: ranked region table left, demographic breakdown
          right, same shape (and same ENROLLMENT_TABLE_HEIGHT) as Enrollment's
          table/graph row. */}
      <div className={`mt-6 ${TWO_COLUMN_GRID_CLASS}`} style={{ minHeight: DATA_ZONE_MIN_HEIGHT }}>
        <div>
          {/* Fixed h-7 (matches RegionTable's own header-cell height) so this
              row's height doesn't depend on whether RegionAddControl renders
              — Delaware has no regions at all, so without a fixed height its
              heading sat a few px higher than every other state's, whose
              taller control+heading row pushes the centered heading down. */}
          <div className="flex h-7 items-center justify-between gap-4">
            <h2 className={SECTION_HEADING_CLASS}>
              Students by {state.geoUnit ?? "region"}, {activeYear}
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
          {/* Trend mode (1+ regions selected) fully replaces demographics —
              not coexist, not relocate (see isTrending above). Demographics
              is state-wide and doesn't react to region selection at all, so
              once a region IS selected, its own history is the more useful
              thing to show in this slot. */}
          {/* Same fixed h-7 as the region table's heading row, and for the
              same reason — a state with no demographics at all (demoKeys
              empty) shouldn't get a shorter heading row than one with
              category pills. */}
          <div className="flex h-7 items-center justify-between gap-4">
            <h2 className={SECTION_HEADING_CLASS}>
              {isTrending ? "Trends" : "Reported subgroups"}
            </h2>
            {isTrending ? (
              <ComparisonLegend
                states={selectedRegions}
                colorForState={colorForRegion}
                highlighted={highlightedRegion}
                onHover={setHoveredRegion}
                onTogglePin={toggleRegionPin}
                labelForItem={shortRegionLabel}
              />
            ) : (
              /* Category pills sit in the heading row, trailing — same spot
                 ComparisonLegend occupies next to Enrollment's "Trends"
                 heading. */
              demoKeys.length > 0 && (
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
              )
            )}
            {/* Third flex child alongside the heading + legend — same
                3-way justify-between row Enrollment's own Trends heading
                uses for its export button. Only the trend chart (not the
                demographic bars) is exportable, same as the backlog scoped
                it. */}
            {isTrending && <DownloadPngButton onClick={startTrendExport} />}
          </div>

          <div className="mt-3" style={{ height: ENROLLMENT_TABLE_HEIGHT }}>
            {isTrending ? (
              <ComparisonTrend
                rows={trendRows}
                states={selectedRegions}
                colorForState={colorForRegion}
                highlighted={highlightedRegion}
                selectedYear={parseInt(activeYear, 10)}
                formatYear={(y) => yearByNumber.get(y) ?? String(y)}
              />
            ) : demoKeys.length === 0 ? (
              <DataPlaceholder height={ENROLLMENT_TABLE_HEIGHT}>
                {hasDemographicsAnyYear
                  ? `No demographic breakdown reported for ${activeYear}.`
                  : `${state.name} does not yet report a demographic breakdown.`}
              </DataPlaceholder>
            ) : (
              <div className="flex h-full flex-col justify-center gap-2.5 overflow-y-auto">
                {demographicsForYear[activeDemo].map((row, i) => {
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

      {/* Off-screen export compositions — same pattern as Enrollment's
          (usePngExport + ChartExportCard), mounted only while a download is
          in flight. Two independent artifacts, so each gets its own pending
          flag: the map doesn't need the trend chart mounted to export, and
          vice versa. */}
      {mapExportPending && (
        <div
          aria-hidden="true"
          style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}
        >
          <div ref={mapExportRef}>
            <ChartExportCard
              title={`${state.name} homeschool enrollment by ${unitLabel.toLowerCase()}`}
              subtitle={`Students, ${activeYear}`}
              citation={stateExplorerCitation(state.name)}
              chartHeight={null}
            >
              {/* No wrapper div needed — RegionMap sizes itself off its own
                  viewBox (h-auto w-full), same as ChoroplethMap's export. */}
              <RegionMap
                stateKey={stateKey}
                regions={regionsForDisplay}
                breaks={regionBreaks}
                selectedRegions={selectedRegions}
                onToggleRegion={() => {}}
                unitLabel={unitLabel.toLowerCase()}
                // Unique defs id so this copy's hover-glow filter can't
                // collide with the live map's — see RegionMap's own
                // idPrefix comment.
                idPrefix="-explorer-export"
              />
              <div className="mt-3">
                <MapLegend label={`Students, ${activeYear}`} swatches={legendSwatches} />
              </div>
            </ChartExportCard>
          </div>
        </div>
      )}

      {trendExportPending && (
        <div
          aria-hidden="true"
          style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}
        >
          <div ref={trendExportRef}>
            <ChartExportCard
              title={`${state.name} enrollment trends by ${unitLabel.toLowerCase()}`}
              subtitle={`Comparing ${selectedRegions.length} ${
                selectedRegions.length === 1
                  ? unitLabel.toLowerCase()
                  : geoUnitPlural(state.geoUnit ?? "region")
              } · ${availableYears[0]} to ${availableYears[availableYears.length - 1]}`}
              citation={stateExplorerCitation(state.name)}
              legend={
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {selectedRegions.map((name) => (
                    <span
                      key={name}
                      className="flex items-center gap-1.5 text-xs text-sable/80"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colorForRegion(name) }}
                      />
                      {shortRegionLabel(name)}
                    </span>
                  ))}
                </div>
              }
            >
              {/* selectedYear/formatYear omitted — same call as Enrollment's
                  own trend export: the dashed selected-year guide line is a
                  live-page affordance, not part of the republished image. */}
              <ComparisonTrend
                rows={trendRows}
                states={selectedRegions}
                colorForState={colorForRegion}
                highlighted={null}
              />
            </ChartExportCard>
          </div>
        </div>
      )}
    </div>
  );
}
