/**
 * ChoroplethMap — US state choropleth, rendered as an inline SVG.
 *
 * All d3-geo usage in this app is confined to this file and `lib/geoProjection.js`.
 * The TopoJSON file (~110KB) lives in /public and is fetched once at mount.
 *
 * Props:
 *   - valuesByState  { [stateName: string]: number | null }  reporting numbers
 *                    for the active year. `null` means non-reporting.
 *   - breaks         number[]   quintile break points produced by
 *                    `computeQuantileBreaks`. Length = RAMP_STEPS.length + 1.
 *   - selectedState  string     the currently-selected state name.
 *   - onSelect       (name)     invoked when a state (or DC marker) is clicked.
 *
 * Visual rules:
 *   - Reporting states fill from the SPIRIT → HERITAGE blue ramp, classified
 *     into quintiles so the right-skewed distribution still shows variation.
 *   - Non-reporting states use a diagonal-stripe pattern on a light-gray ground.
 *   - Hover: subtle fill darkening via CSS — no React state, no re-renders on
 *     mousemove. This is what fixes the "stuck hover" problem the previous
 *     three-pass render produced when the hovered path's DOM identity swapped
 *     between layers under the cursor.
 *   - Selection: a non-interactive overlay layer above the map paints the
 *     selected state with a sable ring and a soft drop-shadow. The base layer
 *     dims all non-selected states ~14% so attention falls on the selection
 *     without the ring having to shout.
 *   - DC: a small marker circle with a leader line (DC is too tiny to color
 *     reliably on a continental projection).
 */

import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import { BY_FIPS } from "../config/states.js";
import { COLORS, RAMP_STEPS } from "../config/theme.js";
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
const STROKE_RING = 2.5; // sable selection ring on the overlay layer
const STROKE_INNER = 2; // white inner line, clipped to the state's
// interior so only the inner half (~1px) shows;
// produces a crisp hairline of white between
// the sable ring and the state fill

/**
 * Map a reporting value to one of the RAMP_STEPS buckets via quintile breaks.
 * Returns the non-reporting pattern reference when no value exists.
 */
function fillFor(value, breaks) {
  if (value == null) return "url(#non-reporting)";
  if (!breaks) return RAMP_STEPS[0];
  // breaks has RAMP_STEPS.length + 1 entries. Find the bucket whose upper
  // bound is >= value. Defensive: clamp to the last bucket if value exceeds.
  for (let i = 0; i < RAMP_STEPS.length; i += 1) {
    if (value <= breaks[i + 1]) return RAMP_STEPS[i];
  }
  return RAMP_STEPS[RAMP_STEPS.length - 1];
}

export default function ChoroplethMap({
  valuesByState,
  breaks,
  selectedState,
  onSelect,
}) {
  // TopoJSON is fetched once at mount. Until it loads the SVG renders empty.
  const [features, setFeatures] = useState(null);

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

  // Pre-resolve the selected state's feature so the overlay layer doesn't
  // re-scan the feature list on every render.
  const selectedFeature = useMemo(() => {
    if (!features) return null;
    return features.features.find((f) => {
      const m = BY_FIPS[f.id];
      return m && m.name === selectedState;
    });
  }, [features, selectedState]);

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
  const dcValue = valuesByState["District of Columbia"] ?? null;
  const dcSelected = selectedState === "District of Columbia";

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="block h-auto w-full"
      role="img"
      aria-label="US choropleth of reported homeschool enrollment by state"
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
            The two whites give a visible halo on dark fills like heritage
            states without reading as a hard racing stripe. */}
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
            against the dark heritage states). */}
        <filter
          id="state-hover-glow"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
        >
          <feDropShadow
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
        comes from CSS so mouse movement does not trigger React renders. The
        selected state stays in this layer too (so it accepts clicks and isn't
        dimmed), but the overlay layer below paints its ring + shadow on top.
      */}
      <g className={selectedState ? "map-base--has-selection" : ""}>
        {features.features.map((f) => {
          const meta = BY_FIPS[f.id];
          if (!meta) return null; // territories carried in the topojson
          const name = meta.name;
          if (name === "District of Columbia") return null; // marker handled below
          const value = valuesByState[name] ?? null;
          const isReporting = value != null;
          const isSelected = name === selectedState;

          let className = "state-path";
          if (isReporting) className += " state-path--clickable";
          if (isSelected) className += " state-path--selected";

          return (
            <path
              key={f.id}
              d={path(f)}
              className={className}
              fill={fillFor(value, breaks)}
              stroke="#FFFFFF"
              strokeWidth={STROKE_REST}
              onClick={isReporting ? () => onSelect(name) : undefined}
            />
          );
        })}
      </g>

      {/*
        Selection overlay. Non-interactive so hit-testing still falls through
        to the base layer. Three stacked paths:
          1. Filled path with the selection-lift filter — outer soft white
             halo + drop shadow.
          2. Stroke-only sable path — the crisp selection ring, centered on
             the state edge.
          3. Stroke-only white path, clipped to the state's own interior so
             only the inside half of the stroke shows — a hairline of white
             between the sable ring and the state fill. Classic double-stroke
             framing; makes the selection read as deliberate.
      */}
      <g style={{ pointerEvents: "none" }}>
        {selectedFeature &&
          selectedState !== "District of Columbia" &&
          (() => {
            const value = valuesByState[selectedState] ?? null;
            const d = path(selectedFeature);
            const fill = fillFor(value, breaks);
            return (
              <>
                <defs>
                  <clipPath id="selection-inner-clip">
                    <path d={d} />
                  </clipPath>
                </defs>
                <path
                  d={d}
                  fill={fill}
                  stroke="none"
                  filter="url(#selection-lift)"
                />
                <path
                  d={d}
                  fill="none"
                  stroke={COLORS.sable}
                  strokeWidth={STROKE_RING}
                  strokeLinejoin="round"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={STROKE_INNER}
                  strokeLinejoin="round"
                  clipPath="url(#selection-inner-clip)"
                />
              </>
            );
          })()}
      </g>

      {/* DC: leader line + marker circle. Click + hover handled directly here
          since DC is tiny enough that CSS hover on the same circle is fine. */}
      {dcPoint && (
        <g
          style={{ cursor: dcValue == null ? "default" : "pointer" }}
          onClick={
            dcValue == null ? undefined : () => onSelect("District of Columbia")
          }
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
              fill={fillFor(dcValue, breaks)}
              stroke="#FFFFFF"
              strokeWidth={STROKE_REST}
            />
          )}
          {dcSelected && (
            <>
              <defs>
                <clipPath id="dc-inner-clip">
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
                fill={fillFor(dcValue, breaks)}
                stroke="none"
                filter="url(#selection-lift)"
              />
              <circle
                cx={dcPoint[0] + DC_LEADER_LENGTH}
                cy={dcPoint[1] + DC_LEADER_LENGTH}
                r={DC_MARKER_RADIUS}
                fill="none"
                stroke={COLORS.sable}
                strokeWidth={STROKE_RING}
              />
              <circle
                cx={dcPoint[0] + DC_LEADER_LENGTH}
                cy={dcPoint[1] + DC_LEADER_LENGTH}
                r={DC_MARKER_RADIUS}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={STROKE_INNER}
                clipPath="url(#dc-inner-clip)"
              />
            </>
          )}
        </g>
      )}
    </svg>
  );
}
