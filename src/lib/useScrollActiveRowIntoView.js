/**
 * Keeps the active-year row visible inside a fixed-height scrolling table when
 * the year changes, without ever touching the page's own scroll position.
 *
 * Extracted because both EnrollmentTable and EnrollmentComparisonTable had
 * independently used `row.scrollIntoView({ block: "nearest" })` for this —
 * which sounds contained but isn't: "nearest" still walks up and scrolls
 * EVERY scrollable ancestor as needed, including the window itself, whenever
 * the table's own container isn't fully within the viewport (e.g. it's
 * partway below the fold, which it usually is on this page). That was
 * shifting the whole page a few dozen px on every year change. Clamping the
 * table's own `scrollTop` directly keeps the adjustment contained to the
 * table, matching what "nearest" was supposed to feel like.
 */
import { useEffect, useRef } from "react";

// Matches the tables' sticky header height (`h-7`) — a row scrolled to "just
// visible" still needs to clear the header's own height, or it sits behind it.
const HEAD_CELL_HEIGHT = 28;

export function useScrollActiveRowIntoView(activeYear) {
  const activeRowRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const row = activeRowRef.current;
    const container = containerRef.current;
    if (!row || !container) return;
    const rowTop =
      row.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    const rowBottom = rowTop + row.offsetHeight;
    const viewTop = container.scrollTop + HEAD_CELL_HEIGHT;
    const viewBottom = container.scrollTop + container.clientHeight;
    if (rowTop < viewTop) container.scrollTop = rowTop - HEAD_CELL_HEIGHT;
    else if (rowBottom > viewBottom) container.scrollTop = rowBottom - container.clientHeight;
  }, [activeYear]);

  return { activeRowRef, containerRef };
}
