/**
 * ChoroplethMap — US state choropleth, rendered as an inline SVG.
 *
 * View-agnostic: the map knows nothing about enrollment vs. regulation data.
 * Each view supplies callbacks that map a state name to a fill, an
 * interactivity flag, and an accessible label, plus the set of currently
 * selected states. This lets the Enrollment view (single-select, blue quintile
 * ramp) and the State policies view (multi-select, categorical level ramp)
 * share one map.
 *
 * Two render modes, chosen per deploy via `mode` (wired to config MAP_MODE),
 * NOT a user-facing toggle:
 *   - 'geo'  — geographic choropleth on a projected TopoJSON (default).
 *   - 'tile' — square tile grid (config/tileGrid.js); equal-size states so the
 *              small ones and DC are as clickable as Texas.
 * Both modes share the same fills, selection styling, legend, and the full
 * fillForState / selectedStates / onSelect / ariaLabelForState API — the only
 * difference is geometry (projected paths vs. grid rects).
 *
 * All d3-geo usage in this app is confined to this file and `lib/geoProjection.js`.
 * The TopoJSON file (~110KB) lives in /public and is fetched once at mount, in
 * geo mode only — tile mode is self-contained from config and skips the fetch.
 *
 * Props:
 *   - fillForState      (name) => string   fill for a state: a color, or
 *                       "url(#non-reporting)" for the diagonal-stripe pattern.
 *   - selectedStates    string[]           names currently selected (0..n).
 *   - onSelect          (name)             invoked when an interactive state
 *                       (or DC marker) is clicked / activated.
 *   - selectionStroke   string             ring color for selected states
 *                       (default sable; the policy view passes heritage blue).
 *   - isInteractive     (name) => boolean  whether a state accepts selection
 *                       (default: all). Non-interactive states are unfocusable
 *                       and hidden from assistive tech.
 *   - ariaLabelForState (name) => string   accessible label for an interactive
 *                       state (default: the name alone).
 *   - mode              'geo' | 'tile'     geometry to render (default 'geo').
 *   - idPrefix          string             suffix appended to the shared <defs>
 *                       ids (pattern + filters). Default "" keeps the canonical
 *                       ids the global CSS and legend reference. A second map on
 *                       the same page (e.g. the off-screen PNG-export copy) MUST
 *                       pass a unique prefix so its defs don't collide with this
 *                       one's — duplicate SVG ids corrupt fill/filter resolution.
 *
 * Visual rules:
 *   - Non-reporting / inert states use a diagonal-stripe pattern (the view's
 *     fillForState returns the pattern url for them).
 *   - Hover: subtle fill darkening via CSS — no React state, no re-renders on
 *     mousemove. This is what fixes the "stuck hover" problem the previous
 *     three-pass render produced when the hovered path's DOM identity swapped
 *     between layers under the cursor.
 *   - Selection: a non-interactive overlay layer above the map paints each
 *     selected state with a ring and a soft drop-shadow. The base layer dims
 *     all non-selected states ~14% so attention falls on the selection without
 *     the ring having to shout.
 *   - DC: a small marker circle with a leader line (DC is too tiny to color
 *     reliably on a continental projection).
 */

import { useEffect, useId, useMemo, useState } from "react";
import { feature } from "topojson-client";
import { BY_FIPS, BY_NAME, BY_POSTAL } from "../config/states.js";
import { COLORS, labelColorForFill } from "../config/theme.js";
import {
  GRID_COLS,
  GRID_ROWS,
  TILE_BOTTOM_PAD,
  TILE_GAP,
  TILE_GRID,
  TILE_H,
  TILE_RADIUS,
  TILE_W,
} from "../config/tileGrid.js";
import { buildProjection } from "../lib/geoProjection.js";

// SVG viewBox dimensions. The map scales to its container via CSS; these
// numbers just set the internal coordinate system the projection fits into.
const VIEW_W = 760;
const VIEW_H = 460;

// DC sits inside MD on the projection, so we draw a separate marker with a
// short leader line pointing to where DC really is.
const DC_MARKER_RADIUS = 5;
const DC_LEADER_LENGTH = 26;

// Stroke weights. The "halo" the selected state shows around itself comes
// from a blur filter (see <filter id="selection-lift">), not from a stroke —
// that's what gives it a soft glow feel rather than a hard racing stripe.
// Hover affordance and dim-on-selection are driven by CSS rules in
// `src/styles/index.css`.
const STROKE_REST = 0.6; // white separator between resting states
const STROKE_RING = 2.5; // selection ring on the overlay layer
const STROKE_INNER = 2; // white inner line, clipped to the state's
// interior so only the inner half (~1px) shows;
// produces a crisp hairline of white between
// the selection ring and the state fill

const DC_NAME = "District of Columbia";

// Geo hover-label anchor overrides, [lng, lat]. A few states are concave enough
// (an "L" or twin peninsulas) that their geometric centroid lands off the shape
// — Florida's falls in the Gulf, Michigan's in the lakes. For those, place the
// label at a hand-picked point inside the visible body instead. Projected with
// the live projection at render time, so it survives any viewBox change. Add a
// state here if its centroid label ever drifts off-shape.
const HOVER_LABEL_ANCHORS = {
  Florida: [-81.6, 28.2],
  Louisiana: [-92.6, 31.5],
  Michigan: [-84.8, 43.4],
};

// Tile mode: the drawn tile (footprint minus the white channel) and its
// always-on postal label. The label uses the same sable-glyph / white-halo
// treatment as the geo hover label so it stays legible on both the light and
// dark ends of the fill ramp.
const TILE_DRAWN_W = TILE_W - TILE_GAP;
const TILE_DRAWN_H = TILE_H - TILE_GAP;
const TILE_LABEL_SIZE = 16;

export default function ChoroplethMap({
  fillForState,
  selectedStates = [],
  onSelect,
  selectionStroke = COLORS.sable,
  isInteractive = () => true,
  ariaLabelForState = (name) => name,
  mode = "geo",
  idPrefix = "",
}) {
  const isTile = mode === "tile";

  // Shared <defs> ids, suffixed so two maps on one page never collide. Default
  // (empty) prefix yields the canonical ids the global CSS + legend swatch use.
  const nonReportingId = `non-reporting${idPrefix}`;
  const selectionLiftId = `selection-lift${idPrefix}`;
  const hoverGlowId = `state-hover-glow${idPrefix}`;

  // Resolve a fill from the view's fillForState, mapping the non-reporting
  // sentinel to THIS instance's pattern id (fillForState returns the canonical
  // "url(#non-reporting)"; the export copy needs its own suffixed pattern).
  const resolveFill = (name) => {
    const f = fillForState(name);
    return f === "url(#non-reporting)" ? `url(#${nonReportingId})` : f;
  };

  // TopoJSON is fetched once at mount (geo mode only). Until it loads the SVG
  // renders empty. Tile mode is self-contained from config, so it never fetches.
  const [features, setFeatures] = useState(null);

  // Name of the state under the cursor, or null. Set on mouseenter/mouseleave
  // (which fire only when the pointer crosses a state boundary — not on every
  // mousemove), so this re-renders at most once per hovered state, cheaply.
  // Drives the on-hover abbreviation label so a reader can tell which state is
  // which. The fill-darkening hover glow is separate and stays CSS-only.
  const [hoveredState, setHoveredState] = useState(null);

  // Namespace clipPath ids so two ChoroplethMap instances on a page (unlikely
  // here, but cheap insurance) don't collide. Plain string ids would silently
  // bind the second map's clip to the first map's path.
  const uid = useId();
  const dcClipId = `dc-inner-clip-${uid}`;

  useEffect(() => {
    if (isTile) return; // tile mode needs no projection data
    const url = `${import.meta.env.BASE_URL}us-states-10m.json`;
    let cancelled = false;
    fetch(url)
      .then((r) => r.json())
      .then((topo) => {
        if (cancelled) return;
        setFeatures(feature(topo, topo.objects.states));
      });
    return () => {
      cancelled = true;
    };
  }, [isTile]);

  // Projection + path generator are memoized inside buildProjection() against
  // the FeatureCollection identity, so re-renders are cheap.
  const projected = useMemo(() => {
    if (!features) return null;
    return buildProjection(features, VIEW_W, VIEW_H);
  }, [features]);

  // DC's projected pixel location for the marker + leader line.
  const dcPoint = useMemo(() => {
    if (!projected) return null;
    return projected.projection([-77.0369, 38.9072]);
  }, [projected]);

  // Pre-resolve the selected states' features (excluding DC, which renders as a
  // marker) so the overlay layer doesn't re-scan the feature list every render.
  const selectedFeatures = useMemo(() => {
    if (!features) return [];
    return features.features.filter((f) => {
      const m = BY_FIPS[f.id];
      return m && m.name !== DC_NAME && selectedStates.includes(m.name);
    });
  }, [features, selectedStates]);

  const hasSelection = selectedStates.length > 0;

  // Interaction props for a selectable state, or the inert aria-hidden props
  // for a non-interactive one. Identical across geo paths, the DC group, and
  // the tile rects — one definition so the three keyboard/click surfaces can't
  // drift apart. Enter and Space both select, matching native <button>.
  const interactionProps = (name, isSelected) =>
    isInteractive(name)
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": ariaLabelForState(name),
          "aria-pressed": isSelected,
          onClick: () => onSelect(name),
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(name);
            }
          },
        }
      : { "aria-hidden": true };

  // Shared <defs>: the non-reporting stripe pattern and the selection/hover
  // filters. Fixed ids, identical for both modes, referenced by fills and CSS.
  const sharedDefs = (
    <defs>
      {/* Diagonal stripes for states that do not publicly report. */}
      <pattern
        id={nonReportingId}
        patternUnits="userSpaceOnUse"
        width="6"
        height="6"
        patternTransform="rotate(45)"
      >
        <rect width="6" height="6" fill={COLORS.nonReportingGround} />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="6"
          stroke={COLORS.nonReportingStripe}
          strokeWidth="2"
        />
      </pattern>

      {/* Selection lift: three stacked feDropShadow primitives produce
          (a) a tight, nearly opaque white halo right at the shape's edge,
          (b) a softer wider white falloff that fades to nothing, and
          (c) a low-opacity black drop-shadow for lift off the map.
          The two whites give a visible halo on dark fills without reading
          as a hard racing stripe. */}
      <filter id={selectionLiftId} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow
          dx="0"
          dy="0"
          stdDeviation="2"
          floodColor="#FFFFFF"
          floodOpacity="1"
        />
        <feDropShadow
          dx="0"
          dy="0"
          stdDeviation="4"
          floodColor="#FFFFFF"
          floodOpacity="0.7"
        />
        <feDropShadow
          dx="0"
          dy="3"
          stdDeviation="4"
          floodColor="#000000"
          floodOpacity="0.2"
        />
      </filter>

      {/* Hover affordance: a thin sable outer glow. Lives outside the shape so
          it can't be clipped by neighbours, and it reads on every fill (the
          brightness shift on its own disappears against the dark fills). */}
      <filter id={hoverGlowId} x="-10%" y="-10%" width="120%" height="120%">
        {/* Darken the source fill by ~10% (equivalent to CSS brightness(0.90))
            before the drop shadow renders. Doing the brightness shift here —
            rather than chaining it in the CSS `filter` shorthand alongside
            url(#state-hover-glow) — works around a WebKit bug where Safari
            silently drops the whole filter when a url() reference is combined
            with a filter function like brightness(). */}
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="0.90 0 0 0 0
                  0 0.90 0 0 0
                  0 0 0.90 0 0
                  0 0 0 1 0"
          result="darkened"
        />
        <feDropShadow
          in="darkened"
          dx="0"
          dy="0"
          stdDeviation="1.5"
          floodColor="#31261D"
          floodOpacity="0.62"
        />
      </filter>
    </defs>
  );

  // Tile mode: one rounded rect per state on the config grid. Equal-size tiles
  // mean small states and DC are ordinary click targets — no marker or callout.
  // Selection ring/halo overlay parity with geo lands in the next step; this
  // pass wires fills, always-on labels, hover (via shared CSS), and click.
  if (isTile) {
    // viewBox sized tight to the grid so it fills the container width edge to
    // edge (no dead margin). The 13-wide grid already carries roughly geo's
    // aspect ratio, so this lands at a comparable footprint. Empty cells (e.g.
    // the Atlantic corner below RI) read as the map's natural silhouette.
    const tileViewW = GRID_COLS * TILE_W;
    const tileViewH = GRID_ROWS * TILE_H + TILE_BOTTOM_PAD;

    // Precompute each tile's geometry/state once, then render in three z-ordered
    // passes (fills → selection overlay → labels) so the selection halo never
    // paints over a label.
    const tiles = Object.entries(TILE_GRID).map(([postal, { row, col }]) => {
      const name = BY_POSTAL[postal].name;
      const interactive = isInteractive(name);
      const isSelected = selectedStates.includes(name);
      const x = col * TILE_W + TILE_GAP / 2;
      const y = row * TILE_H + TILE_GAP / 2;
      let className = "state-path";
      if (interactive) className += " state-path--clickable";
      if (isSelected) className += " state-path--selected";
      return {
        postal,
        name,
        fill: resolveFill(name),
        isSelected,
        className,
        x,
        y,
        cx: x + TILE_DRAWN_W / 2,
        cy: y + TILE_DRAWN_H / 2,
      };
    });

    return (
      <svg
        viewBox={`0 0 ${tileViewW} ${tileViewH}`}
        className="block h-auto w-full"
        role="img"
        aria-label="US tile grid by state"
      >
        {sharedDefs}

        {/* Base fills: one rect per state. Hover glow + dim-on-selection come
            from the shared CSS (same classes as the geo paths). */}
        <g className={hasSelection ? "map-base--has-selection" : ""}>
          {tiles.map(({ postal, name, fill, className, isSelected, x, y }) => (
            <rect
              key={postal}
              x={x}
              y={y}
              width={TILE_DRAWN_W}
              height={TILE_DRAWN_H}
              rx={TILE_RADIUS}
              className={className}
              fill={fill}
              onMouseEnter={() => setHoveredState(name)}
              onMouseLeave={() => setHoveredState(null)}
              {...interactionProps(name, isSelected)}
            />
          ))}
        </g>

        {/* Selection overlay: soft white halo + drop shadow, the selection ring,
            and a clipped white inner hairline — the same three-layer treatment
            the geo map uses. Non-interactive so clicks fall through to the base
            tile below. */}
        <g style={{ pointerEvents: "none" }}>
          {tiles
            .filter((t) => t.isSelected)
            .map(({ postal, fill, x, y }) => {
              const clipId = `tile-selection-clip-${uid}-${postal}`;
              const shape = {
                x,
                y,
                width: TILE_DRAWN_W,
                height: TILE_DRAWN_H,
                rx: TILE_RADIUS,
              };
              return (
                <g key={postal}>
                  <defs>
                    <clipPath id={clipId}>
                      <rect {...shape} />
                    </clipPath>
                  </defs>
                  <rect {...shape} fill={fill} filter={`url(#${selectionLiftId})`} />
                  <rect
                    {...shape}
                    fill="none"
                    stroke={selectionStroke}
                    strokeWidth={STROKE_RING}
                    strokeLinejoin="round"
                  />
                  <rect
                    {...shape}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={STROKE_INNER}
                    strokeLinejoin="round"
                    clipPath={`url(#${clipId})`}
                  />
                </g>
              );
            })}
        </g>

        {/* Labels: topmost so the selection overlay never covers them. Color
            follows each tile's luminance (white on dark, sable on light / no
            data) for contrast without a heavy outline. */}
        <g style={{ pointerEvents: "none" }}>
          {tiles.map(({ postal, fill, cx, cy }) => (
            <text
              key={postal}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill={labelColorForFill(fill)}
              fontFamily="Work Sans, sans-serif"
              fontSize={TILE_LABEL_SIZE}
              fontWeight={700}
              letterSpacing="0.02em"
            >
              {postal}
            </text>
          ))}
        </g>
      </svg>
    );
  }

  if (!features || !projected) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
        aria-busy="true"
      />
    );
  }

  const { path } = projected;
  const dcInteractive = isInteractive(DC_NAME);
  const dcSelected = selectedStates.includes(DC_NAME);

  // Position + text for the on-hover abbreviation label. DC is placed at its
  // marker (its geographic centroid sits inside Maryland); every other state
  // labels at its projected path centroid. Guarded against non-finite
  // centroids so a malformed feature can't throw mid-render.
  let hoverLabel = null;
  if (hoveredState) {
    const abbr = BY_NAME[hoveredState]?.postal;
    if (abbr && hoveredState === DC_NAME && dcPoint) {
      hoverLabel = {
        abbr,
        x: dcPoint[0] + DC_LEADER_LENGTH,
        y: dcPoint[1] + DC_LEADER_LENGTH,
      };
    } else if (abbr) {
      // Prefer a hand-picked anchor for concave states; otherwise the polygon
      // centroid. Both go through the same projection so they share a space.
      const anchor = HOVER_LABEL_ANCHORS[hoveredState];
      let c = null;
      if (anchor) {
        c = projected.projection(anchor);
      } else {
        const feat = features.features.find(
          (f) => BY_FIPS[f.id]?.name === hoveredState,
        );
        c = feat && path.centroid(feat);
      }
      if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
        hoverLabel = { abbr, x: c[0], y: c[1] };
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="block h-auto w-full"
      role="img"
      aria-label="US choropleth by state"
    >
      {sharedDefs}

      {/*
        Single base layer: every state rendered exactly once. Hover affordance
        comes from CSS so mouse movement does not trigger React renders. Selected
        states stay in this layer too (so they accept clicks and aren't dimmed),
        but the overlay layer below paints their ring + shadow on top.
      */}
      <g className={hasSelection ? "map-base--has-selection" : ""}>
        {features.features.map((f) => {
          const meta = BY_FIPS[f.id];
          if (!meta) return null; // territories carried in the topojson
          const name = meta.name;
          if (name === DC_NAME) return null; // marker handled below
          const interactive = isInteractive(name);
          const isSelected = selectedStates.includes(name);

          let className = "state-path";
          if (interactive) className += " state-path--clickable";
          if (isSelected) className += " state-path--selected";

          return (
            <path
              key={f.id}
              d={path(f)}
              className={className}
              fill={resolveFill(name)}
              stroke="#FFFFFF"
              strokeWidth={STROKE_REST}
              // Hover label tracks all states, reporting or not — the point is
              // to identify the state under the cursor regardless of data.
              onMouseEnter={() => setHoveredState(name)}
              onMouseLeave={() => setHoveredState(null)}
              {...interactionProps(name, isSelected)}
            />
          );
        })}
      </g>

      {/*
        Selection overlay. Non-interactive so hit-testing still falls through
        to the base layer. For each selected state, three stacked paths:
          1. Filled path with the selection-lift filter — outer soft white
             halo + drop shadow.
          2. Stroke-only path in `selectionStroke` — the crisp selection ring,
             centered on the state edge.
          3. Stroke-only white path, clipped to the state's own interior so
             only the inside half of the stroke shows — a hairline of white
             between the ring and the state fill. Classic double-stroke
             framing; makes the selection read as deliberate.
      */}
      <g style={{ pointerEvents: "none" }}>
        {selectedFeatures.map((f) => {
          const name = BY_FIPS[f.id].name;
          const d = path(f);
          const clipId = `selection-inner-clip-${uid}-${f.id}`;
          return (
            <g key={f.id}>
              <defs>
                <clipPath id={clipId}>
                  <path d={d} />
                </clipPath>
              </defs>
              <path
                d={d}
                fill={resolveFill(name)}
                stroke="none"
                filter={`url(#${selectionLiftId})`}
              />
              <path
                d={d}
                fill="none"
                stroke={selectionStroke}
                strokeWidth={STROKE_RING}
                strokeLinejoin="round"
              />
              <path
                d={d}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={STROKE_INNER}
                strokeLinejoin="round"
                clipPath={`url(#${clipId})`}
              />
            </g>
          );
        })}
      </g>

      {/* DC: leader line + marker circle. Click + hover handled directly here
          since DC is tiny enough that CSS hover on the same circle is fine.
          The <g> takes the keyboard affordance as a whole — focusing the
          group lights up the marker via the .state-path focus rule below. */}
      {dcPoint && (
        <g
          className={dcInteractive ? "state-path state-path--clickable" : undefined}
          style={{ cursor: dcInteractive ? "pointer" : "default" }}
          onMouseEnter={() => setHoveredState(DC_NAME)}
          onMouseLeave={() => setHoveredState(null)}
          {...interactionProps(DC_NAME, dcSelected)}
        >
          <line
            x1={dcPoint[0]}
            y1={dcPoint[1]}
            x2={dcPoint[0] + DC_LEADER_LENGTH}
            y2={dcPoint[1] + DC_LEADER_LENGTH}
            stroke={COLORS.sable}
            strokeOpacity="0.45"
            strokeWidth="0.8"
          />
          {/* Resting (or non-selected) DC marker. When selected, the two
              overlay circles below take over rendering. */}
          {!dcSelected && (
            <circle
              cx={dcPoint[0] + DC_LEADER_LENGTH}
              cy={dcPoint[1] + DC_LEADER_LENGTH}
              r={DC_MARKER_RADIUS}
              fill={resolveFill(DC_NAME)}
              stroke="#FFFFFF"
              strokeWidth={STROKE_REST}
            />
          )}
          {dcSelected && (
            <>
              <defs>
                <clipPath id={dcClipId}>
                  <circle
                    cx={dcPoint[0] + DC_LEADER_LENGTH}
                    cy={dcPoint[1] + DC_LEADER_LENGTH}
                    r={DC_MARKER_RADIUS}
                  />
                </clipPath>
              </defs>
              <circle
                cx={dcPoint[0] + DC_LEADER_LENGTH}
                cy={dcPoint[1] + DC_LEADER_LENGTH}
                r={DC_MARKER_RADIUS}
                fill={resolveFill(DC_NAME)}
                stroke="none"
                filter={`url(#${selectionLiftId})`}
              />
              <circle
                cx={dcPoint[0] + DC_LEADER_LENGTH}
                cy={dcPoint[1] + DC_LEADER_LENGTH}
                r={DC_MARKER_RADIUS}
                fill="none"
                stroke={selectionStroke}
                strokeWidth={STROKE_RING}
              />
              <circle
                cx={dcPoint[0] + DC_LEADER_LENGTH}
                cy={dcPoint[1] + DC_LEADER_LENGTH}
                r={DC_MARKER_RADIUS}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={STROKE_INNER}
                clipPath={`url(#${dcClipId})`}
              />
            </>
          )}
        </g>
      )}

      {/* On-hover abbreviation label — topmost layer so it clears fills and the
          selection ring. Color follows the hovered state's own luminance (white
          on dark fills, sable on light / no-data) for contrast without a heavy
          outline. Non-interactive so it never steals the hover from the state
          beneath it. */}
      {hoverLabel && (
        <text
          x={hoverLabel.x}
          y={hoverLabel.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={labelColorForFill(fillForState(hoveredState))}
          fontFamily="Work Sans, sans-serif"
          fontSize={13}
          fontWeight={700}
          letterSpacing="0.02em"
          style={{ pointerEvents: "none" }}
        >
          {hoverLabel.abbr}
        </text>
      )}
    </svg>
  );
}
