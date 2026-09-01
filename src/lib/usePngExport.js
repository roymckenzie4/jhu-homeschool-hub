/**
 * Shared "Save (PNG)" export flow behind the map and regulation-table download
 * buttons: mount an off-screen copy, wait for it to actually paint, snapshot
 * it, then unmount. Extracted because both buttons had independently
 * hand-rolled this same requestAnimationFrame polling loop with their own
 * RENDER_TIMEOUT_MS constant.
 *
 * paintSelector must match only once the off-screen copy's REAL content has
 * rendered — not a decorative element that's present from the first frame
 * (e.g. a plain "svg path, svg rect" selector can match the map legend's
 * always-present swatch before the async choropleth itself has painted).
 */
import { useEffect, useRef, useState } from "react";
import { exportElementAsPng } from "./exportImage.js";
import { trackEvent } from "./analytics.js";

// Cap on how long to wait for the export copy to paint before giving up, so a
// failed fetch or a bad selector can't hang the pending flag forever.
const RENDER_TIMEOUT_MS = 3000;

export function usePngExport(paintSelector, filename) {
  const exportRef = useRef(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!pending) return undefined;
    let cancelled = false;
    (async () => {
      const node = exportRef.current;
      const start = performance.now();
      while (!cancelled && performance.now() - start < RENDER_TIMEOUT_MS) {
        if (node?.querySelector(paintSelector)) break;
        await new Promise((r) => requestAnimationFrame(r));
      }
      // One more frame so fills/borders/tints settle before capture.
      await new Promise((r) => requestAnimationFrame(r));
      if (cancelled || !exportRef.current) return;
      await exportElementAsPng(exportRef.current, filename);
      trackEvent("download", { file: filename });
      if (!cancelled) setPending(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pending, filename, paintSelector]);

  return { exportRef, pending, startExport: () => setPending(true) };
}
