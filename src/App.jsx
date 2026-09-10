/**
 * App root — the unified shell.
 *
 * One tool, two topics (Enrollment, Regulation) selected by a tab. The shell
 * owns the page frame, the shared headline, the tab bar, the ONE shared
 * choropleth map + legend + chip row, and the active year; each topic supplies
 * a "descriptor" (its map/legend/chip coloring rules — see topics/*Topic) that
 * the shell feeds to those shared components. The topic-specific content below
 * the chip row is a swappable panel (EnrollmentPanel / RegulationPanel).
 *
 * The map stays MOUNTED across tab switches: switching topics only swaps the
 * descriptor, so the 50-state SVG recolors its fills instead of remounting and
 * reprojecting — faster, and visually continuous. Selection lives in the shared
 * context, so a cohort built on one topic survives a switch to the other.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import ViewTabs from "./components/ViewTabs.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select.jsx";
import ChoroplethMap from "./components/ChoroplethMap.jsx";
import MapLegend from "./components/MapLegend.jsx";
import ComparingChips from "./components/ComparingChips.jsx";
import YearSelector from "./components/YearSelector.jsx";
import MapDownloadButton from "./components/MapDownloadButton.jsx";
import Footer from "./components/Footer.jsx";
import EnrollmentPanel from "./components/EnrollmentPanel.jsx";
import RegulationPanel from "./components/RegulationPanel.jsx";
import StateExplorerPanel from "./components/StateExplorerPanel.jsx";
import { useSelection } from "./state/selection.jsx";
import { CHIPS_SLOT_CLASS, TWO_COLUMN_GRID_CLASS } from "./config/layout.js";
import {
  buildEnrollmentDescriptor,
  enrollmentFooter,
  RECENT_YEARS,
  OLDER_YEARS,
  DEFAULT_YEAR,
} from "./topics/enrollmentTopic.jsx";
import { regulationDescriptor, regulationFooter } from "./topics/regulationTopic.jsx";
import {
  EXPLORER_STATES,
  DEFAULT_EXPLORER_STATE,
} from "./data/stateExplorerMockData.js";
import { STATES } from "./config/states.js";
import { COMPARE_CAP } from "./config/selection.js";
import { trackEvent } from "./lib/analytics.js";

const TABS = [
  { id: "enrollment", label: "Enrollment" },
  { id: "regulation", label: "Regulation" },
  { id: "explorer", label: "State Explorer" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("enrollment");
  const [activeYear, setActiveYear] = useState(DEFAULT_YEAR);
  // Phase 2 concept only — see stateExplorerMockData.js. Not part of the
  // shared cross-topic selection; the explorer is inherently single-state.
  const [explorerState, setExplorerState] = useState(DEFAULT_EXPLORER_STATE);
  const { selectedStates, toggleState, clearAll } = useSelection();

  // State Explorer's region-comparison cohort. Lives here (NOT inside
  // StateExplorerPanel, and NOT the cross-topic SelectionProvider above) so
  // it survives switching away from the State Explorer tab and back — the
  // shell unmounts StateExplorerPanel entirely on tab switch (unlike
  // ChoroplethMap, which stays mounted), so any state that lived inside it
  // was lost on every round trip. A region name only means something within
  // its own state's map, so this stays a separate cohort from selectedStates
  // rather than joining the shared context.
  const [selectedRegions, setSelectedRegions] = useState([]);

  // Reset when the explored state itself changes (the dropdown, not the tab)
  // — two different states can share a region name (e.g. both having a
  // "Washington" county/parish), so a stale name has to be cleared explicitly.
  useEffect(() => {
    setSelectedRegions([]);
  }, [explorerState]);

  const toggleRegion = useCallback((name) => {
    setSelectedRegions((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= COMPARE_CAP) return prev;
      return [...prev, name];
    });
  }, []);
  const clearRegions = useCallback(() => setSelectedRegions([]), []);

  const isEnrollment = activeTab === "enrollment";
  const isExplorer = activeTab === "explorer";

  // Toggle instead of a router, so each switch is sent as its own event for
  // view usage to show up in analytics.
  function handleTabChange(id) {
    setActiveTab(id);
    trackEvent("tab_switch", { view: id });
  }

  // Shared map / chip selection: toggle the state and log under the active
  // topic. The map dispatches this additively; the cap lives in the context.
  function selectState(name) {
    toggleState(name);
    trackEvent("state_select", { view: activeTab, state: name });
  }

  // The active topic's coloring/labeling rules for the shared map, legend, and
  // chip row. Enrollment's depends on the year (rebuilt as it changes);
  // regulation's is static.
  const enrollmentDescriptor = useMemo(
    () => buildEnrollmentDescriptor(activeYear),
    [activeYear],
  );
  const descriptor = isEnrollment ? enrollmentDescriptor : regulationDescriptor;
  const footer = isEnrollment ? enrollmentFooter : regulationFooter;

  // Chip dot color, threaded through the active topic's own descriptor rather
  // than special-cased here — enrollment's dotColorForState switches to the
  // per-selection COMPARISON color once 2+ states are selected (so a chip
  // matches the trend line / table header / card dot); regulation's ignores
  // the selection context and always colors by level.
  const chipDotColor = (name) => descriptor.dotColorForState(name, { selectedStates });

  // States still available to add via the chip row's combobox: everything
  // minus the current cohort, alphabetical by display name. Lives here (not
  // inside ComparingChips) so that component stays ignorant of where the full
  // item list comes from — State Explorer's region cohort computes its own
  // available list the same way, from its own source.
  const availableStates = useMemo(
    () =>
      STATES.map((s) => s.name)
        .filter((name) => !selectedStates.includes(name))
        .sort((a, b) => a.localeCompare(b)),
    [selectedStates],
  );

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-4 lg:px-12 lg:py-6">
      <header>
        <h1 className="font-sans text-3xl font-bold leading-[1.2] tracking-tight text-sable">
          Homeschool data across the United States
        </h1>
        <p className="mt-2 max-w-4xl font-sans text-xs leading-relaxed text-sable/70">
          Explore enrollment trends and state-level regulations. Select one
          state for detail, or compare up to six.
        </p>
      </header>

      {/* Tabs on the left; the year control (Enrollment) or a same-spot "as of"
          label (Regulation) on the right. Keeping the year here rather than on
          its own row means the tab row's height governs — the row doesn't
          resize when switching to Regulation, which has no year control. */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <ViewTabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
        <div className="shrink-0">
          {isEnrollment ? (
            <YearSelector
              recentYears={RECENT_YEARS}
              olderYears={OLDER_YEARS}
              activeYear={activeYear}
              onChange={setActiveYear}
            />
          ) : isExplorer ? (
            <div className="flex items-center">
              <span className="mr-3 font-sans text-[11px] font-medium uppercase tracking-widest text-sable/70">
                Explore
              </span>
              <Select value={explorerState} onValueChange={setExplorerState}>
                <SelectTrigger
                  aria-label="Choose a state"
                  className="whitespace-nowrap rounded border border-sable/20 bg-white px-2.5 py-1 font-sans text-xs tabular-nums text-sable transition hover:bg-sable/5"
                >
                  <SelectValue />
                  <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                </SelectTrigger>
                <SelectContent align="end">
                  {Object.entries(EXPLORER_STATES).map(([key, s]) => (
                    <SelectItem key={key} value={key}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span className="font-sans text-[11px] font-medium uppercase tracking-widest text-sable/70">
              Regulations current as of 2024–25
            </span>
          )}
        </div>
      </div>

      {/*
        Shell grid, and also the active tab's ARIA tabpanel — the map, legend,
        and chip row are topic-specific content (they recolor/reselect per
        topic), so they belong inside the panel boundary alongside the topic's
        own card/data, not outside it. tabIndex={0} lets keyboard users land on
        the panel directly after activating a tab, per the WAI-ARIA APG tabs
        pattern. On lg the grid is two columns across three rows: row 1 = the
        shared map + legend top-left and the topic's summary card top-right;
        row 2 = the shared selection chip strip, full-width under the map; row
        3 = the topic's data zone full-width below. The map fills its column
        (no gutters) and its width is identical on both tabs, so switching
        topics recolors the mounted map without resizing/reprojecting it. Card
        and data come from the active topic's panel (CARD_SLOT_CLASS /
        DATA_SLOT_CLASS). On mobile the grid is single-column: map -> chips ->
        card -> data.
      */}
      {isExplorer ? (
        // State Explorer is inherently single-state, so it skips the shared
        // US map + comparison-cohort chip row entirely rather than forcing
        // those into a shape that doesn't fit — see StateExplorerPanel.jsx.
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          className="mt-4"
        >
          <StateExplorerPanel
            stateKey={explorerState}
            selectedRegions={selectedRegions}
            onToggleRegion={toggleRegion}
            onClearRegions={clearRegions}
          />
        </div>
      ) : (
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          className={`mt-4 ${TWO_COLUMN_GRID_CLASS}`}
        >
          <div className="lg:col-start-1 lg:row-start-1">
            {/* Shared, always-mounted map. Only the descriptor swaps per topic. */}
            <ChoroplethMap
              fillForState={descriptor.fillForState}
              ariaLabelForState={descriptor.ariaLabelForState}
              selectionStroke={descriptor.selectionStroke}
              selectedStates={selectedStates}
              onSelect={selectState}
            />
            {/* Legend fills the row on its own (flex-wrap justify-between with a
                trailing slot). The PNG button rides in that trailing slot next to
                the topic note so it doesn't steal width and force a wrap. */}
            <div className="mt-2">
              <MapLegend
                label={descriptor.legend.label}
                swatches={descriptor.legend.swatches}
                trailing={
                  <div className="flex items-center gap-5">
                    {descriptor.legend.trailing}
                    <MapDownloadButton
                      descriptor={descriptor}
                      selectedStates={selectedStates}
                      title={descriptor.mapExport.title}
                      subtitle={descriptor.mapExport.subtitle}
                      citation={descriptor.mapExport.citation}
                      filename={descriptor.mapExport.filename}
                    />
                  </div>
                }
              />
            </div>
          </div>

          {/* Selection chips — full-width strip under the map, above the data. */}
          <div className={CHIPS_SLOT_CLASS}>
            <ComparingChips
              selectedItems={selectedStates}
              availableItems={availableStates}
              dotColorForItem={chipDotColor}
              metaForItem={descriptor.metaForState}
              onAdd={selectState}
              onRemove={selectState}
              onClear={clearAll}
              label="Viewing"
            />
          </div>

          {/* Panel content tracks the active tab. Each topic panel returns a
              fragment (its card + data slot children), so they land directly in
              the shell grid above (this div carries the tabpanel role/grid). */}
          {isEnrollment ? <EnrollmentPanel activeYear={activeYear} /> : <RegulationPanel />}
        </div>
      )}

      {!isExplorer && (
        <Footer
          about={footer.about}
          csvText={footer.csvText}
          downloadFilename={footer.downloadFilename}
          lastUpdated={footer.lastUpdated}
        />
      )}
      {isExplorer && (
        <p className="mt-3 border-t border-sable/10 pt-3 font-sans text-[10px] uppercase tracking-widest text-sable/70">
          Concept only — not connected to live data
        </p>
      )}
    </main>
  );
}
