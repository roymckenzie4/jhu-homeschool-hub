/**
 * Shared base check for a build-time snapshot's usability, used by both
 * enrollmentLoader.js and regulationLoader.js before either trusts its
 * snapshot over the bundled CSV fallback.
 *
 * Only checks the shape common to both datasets — a non-null byState object
 * with at least one entry. Each loader layers its own topic-specific check on
 * top (a years array for enrollment, a regulations field per entry for
 * regulation) since the two datasets' shapes genuinely differ beyond this.
 */
export function hasUsableByState(snapshot) {
  const states = snapshot?.byState;
  if (!states || typeof states !== "object") return false;
  return Object.keys(states).length > 0;
}
