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
 * All d3-geo usage in this app is confined to this file and `lib/geoProjection.js`.
 * The TopoJSON file (~110KB) lives in /public and is fetched once at mount.
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
import { BY_FIPS, BY_NAME } from "../config/states.js";
import { COLORS } from "../config/theme.js";
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

export default function ChoroplethMap({
  fillForState,
  selectedStates = [],
  onSelect,
  selectionStroke = COLORS.sable,
  isInteractive = () => true,
  ariaLabelForState = (name) => name,
}) {
  // TopoJSON is fetched once at mount. Until it loads the SVG renders empty.
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
  }, []);

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
  const hasSelection = selectedStates.length > 0;
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
      const feat = features.features.find(
        (f) => BY_FIPS[f.id]?.name === hoveredState,
      );
      const c = feat && path.centroid(feat);
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
      <defs>
        {/* Diagonal stripes for states that do not publicly report. */}
        <pattern
          id="non-reporting"
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
            (a) a tight, nearly opaque white halo right at the state's edge,
            (b) a softer wider white falloff that fades to nothing, and
            (c) a low-opacity black drop-shadow for lift off the map.
            The two whites give a visible halo on dark fills without reading
            as a hard racing stripe. */}
        <filter
          id="selection-lift"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
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

        {/* Hover affordance: a thin sable outer glow. Lives outside the
            path so it can't be clipped by neighboring states, and it reads
            on every fill (the brightness shift on its own disappears
            against the dark fills). */}
        <filter
          id="state-hover-glow"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
        >
          {/* Darken the source fill by ~7% (equivalent to CSS
              brightness(0.93)) before the drop shadow renders. Doing the
              brightness shift here — rather than chaining it in the CSS
              `filter` shorthand alongside url(#state-hover-glow) — works
              around a WebKit bug where Safari silently drops the whole
              filter when a url() reference is combined with a filter
              function like brightness(). */}
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0.93 0 0 0 0
                    0 0.93 0 0 0
                    0 0 0.93 0 0
                    0 0 0 1 0"
            result="darkened"
          />
          <feDropShadow
            in="darkened"
            dx="0"
            dy="0"
            stdDeviation="1.5"
            floodColor="#31261D"
            floodOpacity="0.55"
          />
        </filter>
      </defs>

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

          // Keyboard activation: Enter and Space both select the state, matching
          // native <button> semantics. Non-interactive states are unfocusable and
          // unannounced so keyboard users skip over them, mirroring the mouse
          // experience (no click target).
          const a11y = interactive
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

          return (
            <path
              key={f.id}
              d={path(f)}
              className={className}
              fill={fillForState(name)}
              stroke="#FFFFFF"
              strokeWidth={STROKE_REST}
              // Hover label tracks all states, reporting or not — the point is
              // to identify the state under the cursor regardless of data.
              onMouseEnter={() => setHoveredState(name)}
              onMouseLeave={() => setHoveredState(null)}
              {...a11y}
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
                fill={fillForState(name)}
                stroke="none"
                filter="url(#selection-lift)"
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
          {...(dcInteractive
            ? {
                role: "button",
                tabIndex: 0,
                "aria-label": ariaLabelForState(DC_NAME),
                "aria-pressed": dcSelected,
                onClick: () => onSelect(DC_NAME),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(DC_NAME);
                  }
                },
              }
            : { "aria-hidden": true })}
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
              fill={fillForState(DC_NAME)}
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
                fill={fillForState(DC_NAME)}
                stroke="none"
                filter="url(#selection-lift)"
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
          selection ring. paint-order:stroke draws the white halo behind the
          sable glyphs, keeping it legible over dark heritage fills and the
          diagonal-stripe pattern alike. Non-interactive so it never steals the
          hover from the state beneath it. */}
      {hoverLabel && (
        <text
          x={hoverLabel.x}
          y={hoverLabel.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={COLORS.sable}
          stroke="#FFFFFF"
          strokeWidth={2.5}
          strokeLinejoin="round"
          paintOrder="stroke"
          fontFamily="Work Sans, sans-serif"
          fontSize={13}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          {hoverLabel.abbr}
        </text>
      )}
    </svg>
  );
}
