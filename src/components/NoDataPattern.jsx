/**
 * Diagonal-stripe "no data" SVG <pattern> def, shared by both choropleths
 * (national states, State Explorer counties/districts) and the legend's
 * "No data" swatch. Each renders it inside its own <defs> under a unique id
 * and references it as `url(#id)`.
 */

import { COLORS } from "../config/theme.js";

const STRIPE_SPACING = 6;
const STRIPE_WIDTH = 2;

export function NoDataPattern({ id }) {
  return (
    <pattern
      id={id}
      patternUnits="userSpaceOnUse"
      width={STRIPE_SPACING}
      height={STRIPE_SPACING}
      patternTransform="rotate(45)"
    >
      <rect width={STRIPE_SPACING} height={STRIPE_SPACING} fill={COLORS.nonReportingGround} />
      <line
        x1="0"
        y1="0"
        x2="0"
        y2={STRIPE_SPACING}
        stroke={COLORS.nonReportingStripe}
        strokeWidth={STRIPE_WIDTH}
      />
    </pattern>
  );
}
