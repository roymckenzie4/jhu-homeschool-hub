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
 * table define the artifact width. The paint-wait / snapshot / unmount flow
 * itself lives in usePngExport (shared with MapDownloadButton).
 *
 * Props:
 *   selectedStates  string[] — states shown as rows, mirrored from the shell.
 *   regulationByState   object   — shaped regulation data.
 *   enrollmentLatestYear, enrollmentInLatestYear — forwarded straight through
 *     to RegulationComparisonTable for its Homeschoolers column; sourced from
 *     enrollmentLoader at the RegulationPanel level, not here (see that file).
 *   title, subtitle, citation, filename — export metadata.
 */

import ChartExportCard from "./ChartExportCard.jsx";
import RegulationComparisonTable from "./RegulationComparisonTable.jsx";
import DownloadPngButton from "./DownloadPngButton.jsx";
import { usePngExport } from "../lib/usePngExport.js";

export default function RegulationTableDownloadButton({
  selectedStates,
  regulationByState,
  enrollmentLatestYear,
  enrollmentInLatestYear,
  title,
  subtitle,
  citation,
  filename,
}) {
  // The table is pure DOM (no fetch/recharts), so this settles within a frame
  // or two — "table tbody tr" is specific enough that nothing else in the
  // export card could match it first.
  const { exportRef, pending, startExport } = usePngExport(
    "table tbody tr",
    filename,
  );

  return (
    <>
      <DownloadPngButton onClick={startExport} />

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
                enrollmentLatestYear={enrollmentLatestYear}
                enrollmentInLatestYear={enrollmentInLatestYear}
                forExport
              />
            </ChartExportCard>
          </div>
        </div>
      )}
    </>
  );
}
