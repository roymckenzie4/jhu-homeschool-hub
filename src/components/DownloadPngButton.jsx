/**
 * DownloadPngButton — compact "download this as PNG" trigger.
 *
 * Shared by the chart (EnrollmentPanel) and map (MapDownloadButton) export
 * controls so the affordance looks identical everywhere. Deliberately small
 * (a download glyph + "Save") so it tucks into a legend or heading row without
 * stealing width and forcing a wrap. The glyph already signals a download, so
 * "Save" reads clearer to a lay audience than the file-format label "PNG".
 */

import { Download } from "lucide-react";

export default function DownloadPngButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Save as image"
      className={`flex shrink-0 items-center gap-1 font-sans text-[11px] font-medium text-sable/55 hover:text-heritage ${className}`}
    >
      <Download className="h-3 w-3" />
      Save
    </button>
  );
}
