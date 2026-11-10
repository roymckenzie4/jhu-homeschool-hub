/**
 * Diagonal-stripe "no data" fill, shared by both choropleths (national states,
 * State Explorer counties/districts) and their legends.
 *
 * NoDataPattern is the SVG <pattern> def a map renders inside its own <defs>
 * and references as `url(#id)`. NoDataKey is the legend entry: a small
 * self-contained swatch (its own <defs>, so it also renders inside the
 * off-screen PNG export) plus a text label.
 */

import { COLORS } from "../config/theme.js";

const STRIPE_SPACING = 6;
const STRIPE_WIDTH = 2;
const KEY_W = 20;
const KEY_H = 12;

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

export function NoDataKey({ label, id = "legend-non-reporting" }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap text-sable/70">
      <svg width={KEY_W} height={KEY_H} aria-hidden="true">
        <defs>
          <NoDataPattern id={id} />
        </defs>
        <rect width={KEY_W} height={KEY_H} fill={`url(#${id})`} />
      </svg>
      <span>{label}</span>
    </div>
  );
}
