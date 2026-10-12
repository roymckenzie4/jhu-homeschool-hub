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
 * Text color class for a YoY figure — shared by the detail card and the
 * enrollment table so the two never drift. An exact 0% change gets the same
 * muted treatment as "no data" (not brick): it's a flat trend, not a decline.
 */
export function yoyToneClass(pct) {
  if (pct == null || !Number.isFinite(pct) || pct === 0) return 'text-sable/70';
  return pct > 0 ? 'text-growth' : 'text-brick';
}

/**
 * Format a snapshot's `generatedAt` ISO timestamp for the footer's "Last
 * updated" line, e.g. "September 1, 2026". Falls back to `fallback` (the
 * bundled-CSV case, where there's no snapshot timestamp to show) when `iso`
 * is null/unparseable.
 */
export function formatUpdatedDate(iso, fallback) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Strips a trailing generic administrative-unit phrase from a State Explorer
 * region's real (TIGER) name, for display contexts that need something
 * shorter than the full legal name — currently just the trend chart's
 * legend. Longest/most-specific phrases are checked first, so "X Municipal
 * Schools" strips to "X", not "X Municipal" (the first partial match a
 * shorter-first order would hit). Only strips an exact trailing phrase, never
 * digits or codes after it (e.g. "Florence School District 5" is untouched —
 * that trailing "5" is load-bearing, not boilerplate, since South Carolina
 * has several same-named districts distinguished only by number) — so the
 * fallback floor is always the real, unambiguous full name, never a guess.
 * Falls back to the full name when nothing matches (e.g. Georgia's names,
 * already short).
 *
 * Maine's two historical naming schemes ("School Administrative District
 * NN" / "Regional School Unit NN") are handled separately, as a PREFIX
 * abbreviation rather than a suffix strip — the number here is the whole
 * identity (there's no separate place name alongside it), and "SAD 57" /
 * "RSU 19" are the real, commonly-used short forms for these in Maine itself
 * (see STATUS.md's note on JHU's own workbook calling SAD 57 "RSU 57/MSAD
 * 57"), not an invented abbreviation.
 */
const REGION_SUFFIXES = [
  ' Union Free School District',
  ' Central School District',
  ' Community School District',
  ' County School District',
  ' City School District',
  ' Public School District',
  ' Municipal Schools',
  ' Public Schools',
  ' County Schools',
  ' County School System',
  ' School District',
  ' School System',
  ' School Department',
  ' Schools',
  ' Town',
  ' Parish',
];
const REGION_PREFIXES = [
  [/^School Administrative District (\d+)$/, 'SAD $1'],
  [/^Regional School Unit (\d+)$/, 'RSU $1'],
];
export function shortRegionLabel(name) {
  for (const [pattern, replacement] of REGION_PREFIXES) {
    if (pattern.test(name)) return name.replace(pattern, replacement);
  }
  const suffix = REGION_SUFFIXES.find((s) => name.endsWith(s));
  return suffix ? name.slice(0, -suffix.length) : name;
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
