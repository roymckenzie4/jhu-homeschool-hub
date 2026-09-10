/**
 * Shared click/keyboard interaction props for a selectable map shape (a state
 * path, a county/district path, or the DC marker group) — one definition so
 * the national and State Explorer maps' accessible-selection behavior can't
 * drift apart from each other.
 *
 * Enter and Space both select, matching native <button> semantics. A
 * non-interactive target gets inert aria-hidden props rather than no
 * attributes at all, so it's explicitly hidden from assistive tech instead of
 * just silently unfocusable.
 */
export function buildInteractionProps({
  name,
  isSelected,
  isInteractive,
  onSelect,
  ariaLabelForState,
}) {
  if (!isInteractive(name)) return { "aria-hidden": true };
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": ariaLabelForState(name),
    "aria-pressed": isSelected,
    onClick: () => onSelect(name),
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(name);
      }
    },
  };
}
