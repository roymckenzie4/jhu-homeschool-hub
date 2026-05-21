/**
 * Tiny formatters shared by the detail card and the enrollment table.
 *
 * Kept deliberately small — these are display-only helpers; numeric derivation
 * (YoY %, ranks, totals) lives in `src/data/derive.js`.
 */

/**
 * Comma-format an integer. Returns "—" for null/undefined/non-finite values
 * so that non-reporting cells render consistently.
 */
export function formatNumber(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US');
}

/**
 * Render a YoY percentage as a signed string: "+6.8%", "-3.2%", "0.0%".
 * Returns "—" when no comparison is possible (null input). One decimal place
 * matches the precision shown in the mockup.
 */
export function formatYoY(pct) {
  if (pct == null || !Number.isFinite(pct)) return '—';
  const rounded = pct.toFixed(1);
  if (pct > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

/**
 * English ordinal suffix: 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th",
 * handles the 11/12/13 special cases correctly. Used for the national rank
 * display in the detail card.
 */
export function ordinal(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (abs % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
