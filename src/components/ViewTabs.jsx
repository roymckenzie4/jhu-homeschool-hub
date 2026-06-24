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
      className="flex items-center gap-6 border-b border-sable/15"
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
            className={`-mb-px border-b-2 pb-2 font-sans text-sm transition-colors ${
              isActive
                ? "border-heritage font-semibold text-heritage"
                : "border-transparent text-sable/55 hover:text-sable"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
