/**
 * Hover-glow SVG filter def, shared by every interactive choropleth
 * (national states, State Explorer counties/districts) via the same
 * `.state-path--clickable:hover` CSS rule (src/styles/index.css). Extracted
 * from ChoroplethMap so a second interactive map can render its own copy —
 * SVG <defs> only exist in the DOM of the map that renders them, and the two
 * choropleths are never mounted at once (State Explorer swaps ChoroplethMap
 * out entirely), so the canonical unprefixed id is a safe default here too.
 */
import { COLORS } from "../config/theme.js";

export default function MapHoverGlow({ id = "state-hover-glow" }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
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
        floodColor={COLORS.sable}
        floodOpacity="0.62"
      />
    </filter>
  );
}
