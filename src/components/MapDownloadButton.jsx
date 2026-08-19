/**
 * MapDownloadButton — "PNG" export trigger for the shared choropleth.
 *
 * Reuses the chart-export mechanism, but the off-screen ChartExportCard (a
 * second copy of the map + legend) is mounted ONLY while a download is in
 * flight, not always — the map SVG is heavy, and there's no reason to keep a
 * duplicate in the DOM the whole session. On click it mounts, waits for the
 * map to paint (tile mode is immediate; geo waits on the topojson fetch),
 * snapshots, then unmounts. Topic title / subtitle / citation come from the
 * shell so the artifact is self-attributing after republication.
 *
 * Props:
 *   mode            'geo' | 'tile' — matches the on-screen map's mode.
 *   descriptor      the active topic's map descriptor (fill/label/stroke/legend).
 *   selectedStates  string[] — highlighted states, mirrored from the shell.
 *   title, subtitle, citation, filename — export metadata.
 */

import { useEffect, useRef, useState } from "react";
import ChoroplethMap from "./ChoroplethMap.jsx";
import MapLegend from "./MapLegend.jsx";
import ChartExportCard from "./ChartExportCard.jsx";
import DownloadPngButton from "./DownloadPngButton.jsx";
import { exportElementAsPng } from "../lib/exportImage.js";
import { trackEvent } from "../lib/analytics.js";

// Cap on how long to wait for the export map to paint before giving up, so a
// failed fetch can't hang the pending flag forever.
const RENDER_TIMEOUT_MS = 3000;

export default function MapDownloadButton({
  mode,
  descriptor,
  selectedStates,
  title,
  subtitle,
  citation,
  filename,
}) {
  const exportRef = useRef(null);
  const [pending, setPending] = useState(false);

  // Runs once the off-screen card mounts: wait until the map has painted its
  // shapes, snapshot, then unmount. requestAnimationFrame polling covers both
  // the synchronous tile map and the async (fetched) geo map.
  useEffect(() => {
    if (!pending) return undefined;
    let cancelled = false;
    (async () => {
      const node = exportRef.current;
      const start = performance.now();
      while (!cancelled && performance.now() - start < RENDER_TIMEOUT_MS) {
        if (node?.querySelector("svg path, svg rect")) break;
        await new Promise((r) => requestAnimationFrame(r));
      }
      // One more frame so fills and labels settle before capture.
      await new Promise((r) => requestAnimationFrame(r));
      if (cancelled || !exportRef.current) return;
      await exportElementAsPng(exportRef.current, filename);
      trackEvent("download", { file: filename });
      if (!cancelled) setPending(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pending, filename]);

  return (
    <>
      <DownloadPngButton onClick={() => setPending(true)} />

      {/* Off-screen export copy — mounted only during an in-flight download
          (far left, no pointer events). The map sizes by aspect ratio, so the
          card's chart height is left unset and the legend rides below the map. */}
      {pending && (
        <div
          aria-hidden="true"
          style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}
        >
          <div ref={exportRef}>
            <ChartExportCard
              title={title}
              subtitle={subtitle}
              citation={citation}
              chartHeight={null}
            >
              <ChoroplethMap
                mode={mode}
                fillForState={descriptor.fillForState}
                ariaLabelForState={descriptor.ariaLabelForState}
                selectionStroke={descriptor.selectionStroke}
                selectedStates={selectedStates}
                onSelect={() => {}}
                // Unique defs ids so the off-screen copy can't collide with the
                // live map's canonical ids (the collision that blacked states out).
                idPrefix="-export"
              />
              <div className="mt-3">
                <MapLegend {...descriptor.legend} />
              </div>
            </ChartExportCard>
          </div>
        </div>
      )}
    </>
  );
}
