/**
 * RegulationTableDownloadButton — "Save" export trigger for the regulation
 * comparison table.
 *
 * Reuses the shared chart-export mechanism (ChartExportCard frame + exportImage),
 * same as the chart and map "Save" buttons. Angela asked for a downloadable
 * comparison — a PNG, since the full CSV already ships in the footer — so a
 * republished table carries its own provenance via the baked-in citation.
 *
 * The off-screen ChartExportCard (a second copy of the real comparison table)
 * mounts ONLY while a download is in flight; the table's pinned columns run wider
 * than the default chart frame, so the frame is set to "fit-content" and lets the
 * table define the artifact width. On click it mounts, waits a frame for the
 * table to paint, snapshots, then unmounts.
 *
 * Props:
 *   selectedStates  string[] — states shown as rows, mirrored from the shell.
 *   regulationByState   object   — shaped regulation data.
 *   title, subtitle, citation, filename — export metadata.
 */

import { useEffect, useRef, useState } from "react";
import ChartExportCard from "./ChartExportCard.jsx";
import RegulationComparisonTable from "./RegulationComparisonTable.jsx";
import DownloadPngButton from "./DownloadPngButton.jsx";
import { exportElementAsPng } from "../lib/exportImage.js";
import { trackEvent } from "../lib/analytics.js";

// Cap on how long to wait for the export table to paint before giving up, so a
// hiccup can't hang the pending flag forever.
const RENDER_TIMEOUT_MS = 3000;

export default function RegulationTableDownloadButton({
  selectedStates,
  regulationByState,
  title,
  subtitle,
  citation,
  filename,
}) {
  const exportRef = useRef(null);
  const [pending, setPending] = useState(false);

  // Runs once the off-screen card mounts: wait until the table has painted its
  // rows, snapshot, then unmount. The table is pure DOM (no fetch/recharts), so
  // this settles within a frame or two.
  useEffect(() => {
    if (!pending) return undefined;
    let cancelled = false;
    (async () => {
      const node = exportRef.current;
      const start = performance.now();
      while (!cancelled && performance.now() - start < RENDER_TIMEOUT_MS) {
        if (node?.querySelector("table tbody tr")) break;
        await new Promise((r) => requestAnimationFrame(r));
      }
      // One more frame so borders and tints settle before capture.
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
          (far left, no pointer events). "fit-content" lets the table's pinned
          columns define the frame width; chartHeight null lets the rows define
          its height. */}
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
              width="fit-content"
            >
              <RegulationComparisonTable
                selectedStates={selectedStates}
                regulationByState={regulationByState}
                forExport
              />
            </ChartExportCard>
          </div>
        </div>
      )}
    </>
  );
}
