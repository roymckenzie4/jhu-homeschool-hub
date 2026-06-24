/**
 * Client-side CSV download — shared by both views' "Download data (CSV)"
 * affordances.
 *
 * Wraps the CSV string in a Blob, exposes it via a temporary object URL, and
 * hands it to a synthetic anchor whose `download` attribute prompts a Save
 * dialog. The URL is revoked afterward so the browser can release the Blob.
 */

export function downloadCsv(csvText, filename) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
