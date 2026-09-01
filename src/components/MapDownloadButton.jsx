/**
 * MapDownloadButton — "PNG" export trigger for the shared choropleth.
 *
 * Reuses the chart-export mechanism, but the off-screen ChartExportCard (a
 * second copy of the map + legend) is mounted ONLY while a download is in
 * flight, not always — the map SVG is heavy, and there's no reason to keep a
 * duplicate in the DOM the whole session. The paint-wait / snapshot / unmount
 * flow itself lives in usePngExport (shared with RegulationTableDownloadButton).
 * Topic title / subtitle / citation come from the shell so the artifact is
 * self-attributing after republication.
 *
 * Props:
 *   descriptor      the active topic's map descriptor (fill/label/stroke/legend).
 *   selectedStates  string[] — highlighted states, mirrored from the shell.
 *   title, subtitle, citation, filename — export metadata.
 */

import ChoroplethMap from "./ChoroplethMap.jsx";
import MapLegend from "./MapLegend.jsx";
import ChartExportCard from "./ChartExportCard.jsx";
import DownloadPngButton from "./DownloadPngButton.jsx";
import { usePngExport } from "../lib/usePngExport.js";

export default function MapDownloadButton({
  descriptor,
  selectedStates,
  title,
  subtitle,
  citation,
  filename,
}) {
  // .state-path marks an actual painted state shape — unlike a bare
  // "svg path, svg rect" selector, this can't match the legend's
  // always-present decorative swatch and report a false "painted" before the
  // map's own async (topojson-fetch-dependent) data has rendered.
  const { exportRef, pending, startExport } = usePngExport(
    "svg .state-path",
    filename,
  );

  return (
    <>
      <DownloadPngButton onClick={startExport} />

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
