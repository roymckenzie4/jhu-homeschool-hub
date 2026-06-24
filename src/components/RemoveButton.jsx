/**
 * RemoveButton — the small ✕ used to drop a state from the comparison.
 * Shared by the Comparing chips and the comparison table's STATE cell so the
 * remove affordance looks and behaves identically in both places.
 */

import { X } from "lucide-react";

export default function RemoveButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-full p-0.5 text-sable/40 transition-colors hover:bg-sable/10 hover:text-sable"
    >
      <X className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}
