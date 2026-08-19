/**
 * Client-side chart-image export — shared mechanism behind every "Download
 * chart (PNG)" affordance.
 *
 * Flattens a DOM node (a composed ChartExportCard, rendered off-screen) to a
 * PNG via html-to-image, then hands the data URL to a synthetic anchor whose
 * `download` attribute prompts a Save dialog — same pattern as download.js.
 *
 * Chart-agnostic: any node works. html-to-image inlines computed styles and
 * embeds the web fonts, so the captured image matches what's rendered including
 * Work Sans and the brand colors.
 */

import { toPng } from "html-to-image";

// 2x so the exported image stays crisp when republished at larger sizes or on
// hi-dpi displays.
const PIXEL_RATIO = 2;

export async function exportElementAsPng(node, filename) {
  const dataUrl = await toPng(node, {
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#FFFFFF",
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
