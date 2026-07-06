/**
 * ViewTabs — top-level tab bar that switches between the Enrollment and State
 * policies views.
 *
 * Implemented as an ARIA tablist with roving tabindex and arrow-key
 * navigation, so the structure already satisfies the keyboard requirements of
 * the eventual WCAG 2.1 pass. App owns the active-tab state and renders the
 * matching tabpanel; this component only renders the tab triggers.
 *
 * Props:
 *   - tabs      [{ id, label }]   the available views, in display order.
 *   - activeTab string            id of the currently-active view.
 *   - onChange  (id)              invoked when a tab is activated.
 */

export default function ViewTabs({ tabs, activeTab, onChange }) {
  // Left/Right arrows move between tabs and activate immediately, matching the
  // common "automatic activation" tablist pattern.
  function handleKeyDown(e) {
    const idx = tabs.findIndex((t) => t.id === activeTab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (idx + dir + tabs.length) % tabs.length;
      onChange(tabs[next].id);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Dashboard views"
      onKeyDown={handleKeyDown}
      className="flex items-center gap-1 border-b border-sable/15"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            // Padded hit area with a rounded-top hover pill; a thick heritage
            // underline (sitting on the container border via -mb-px) marks the
            // active tab so the row reads as tabs, not text links.
            className={`-mb-px rounded-t-md border-b-[3px] px-3 pb-2.5 pt-1.5 font-sans text-[15px] transition-[color,background-color] ${
              isActive
                ? "border-heritage font-semibold text-heritage"
                : "border-transparent font-medium text-sable/55 hover:bg-sable/5 hover:text-sable"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
