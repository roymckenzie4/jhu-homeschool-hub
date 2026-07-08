/**
 * App root — the unified shell.
 *
 * One tool, two topics (Enrollment, Regulation) selected by a tab. The shell
 * owns the page frame, the shared headline, the tab bar, the ONE shared
 * choropleth map + legend + chip row, and the active year; each topic supplies
 * a "descriptor" (its map/legend/chip coloring rules — see topics/*Topic) that
 * the shell feeds to those shared components. The topic-specific content below
 * the chip row is a swappable panel (EnrollmentPanel / PolicyPanel).
 *
 * The map stays MOUNTED across tab switches: switching topics only swaps the
 * descriptor, so the 50-state SVG recolors its fills instead of remounting and
 * reprojecting — faster, and visually continuous. Selection lives in the shared
 * context, so a cohort built on one topic survives a switch to the other.
 */

import { useMemo, useState } from "react";
import ViewTabs from "./components/ViewTabs.jsx";
import ChoroplethMap from "./components/ChoroplethMap.jsx";
import MapLegend from "./components/MapLegend.jsx";
import ComparingChips from "./components/ComparingChips.jsx";
import YearSelector from "./components/YearSelector.jsx";
import Footer from "./components/Footer.jsx";
import EnrollmentPanel from "./components/EnrollmentPanel.jsx";
import PolicyPanel from "./components/PolicyPanel.jsx";
import { useSelection } from "./state/selection.jsx";
import { CHIPS_SLOT_CLASS } from "./config/layout.js";
import { comparisonColor } from "./config/theme.js";
import { MAP_MODE } from "./config/tileGrid.js";
import {
  buildEnrollmentDescriptor,
  enrollmentFooter,
  RECENT_YEARS,
  OLDER_YEARS,
  DEFAULT_YEAR,
} from "./topics/enrollmentTopic.jsx";
import { policyDescriptor, policyFooter } from "./topics/policyTopic.jsx";
import { trackEvent } from "./lib/analytics.js";

// Tab ids stay `policy` internally (the Policy-vs-Regulation naming split is
// still an open question for JHU); the user-facing label is "Regulation".
const TABS = [
  { id: "enrollment", label: "Enrollment" },
  { id: "policy", label: "Regulation" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("enrollment");
  const [activeYear, setActiveYear] = useState(DEFAULT_YEAR);
  const { selectedStates, toggleState, clearAll } = useSelection();

  const isEnrollment = activeTab === "enrollment";

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
  // chip row. Enrollment's depends on the year (rebuilt as it changes); policy's
  // is static.
  const enrollmentDescriptor = useMemo(
    () => buildEnrollmentDescriptor(activeYear),
    [activeYear],
  );
  const descriptor = isEnrollment ? enrollmentDescriptor : policyDescriptor;
  const footer = isEnrollment ? enrollmentFooter : policyFooter;

  // Chip dot color. When comparing on Enrollment (2+ states), a chip carries the
  // state's per-state COMPARISON color so it matches the trend line, table
  // header, and card dot — one identity color across every comparison surface.
  // Unselected states (the combobox rows) keep the topic's heatmap color; single
  // / overview / Policy always use the descriptor's heatmap or level color.
  const chipDotColor =
    isEnrollment && selectedStates.length >= 2
      ? (name) => {
          const i = selectedStates.indexOf(name);
          return i >= 0 ? comparisonColor(i) : descriptor.dotColorForState(name);
        }
      : descriptor.dotColorForState;

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-4 lg:px-12 lg:py-6">
      <header>
        <h1 className="font-sans text-3xl font-medium leading-[1.2] tracking-tight text-sable">
          Homeschool data across <span className="font-bold">50 states</span> +
          D.C.
        </h1>
        <p className="mt-2 max-w-4xl font-sans text-xs leading-relaxed text-sable/70">
          Explore enrollment trends and state-level policies. Select one state
          for detail, or choose multiple to compare.
        </p>
      </header>

      {/* Tabs on the left; the year control (Enrollment) or a same-spot "as of"
          label (Policy) on the right. Keeping the year here rather than on its
          own row means the tab row's height governs — the row doesn't resize
          when switching to Policy, which has no year control. */}
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
          ) : (
            <span className="font-sans text-[11px] font-medium uppercase tracking-widest text-sable/50">
              Regulations current as of 2024–25
            </span>
          )}
        </div>
      </div>

      {/*
        Shell grid. On lg it's two columns across three rows: row 1 = the shared
        map + legend top-left and the topic's summary card top-right; row 2 = the
        shared selection chip strip, full-width under the map; row 3 = the topic's
        data zone full-width below. The map fills its column (no gutters) and its
        width is identical on both tabs, so switching topics recolors the mounted
        map without resizing/reprojecting it. Card and data come from the active
        topic's panel (CARD_SLOT_CLASS / DATA_SLOT_CLASS). On mobile the grid is
        single-column: map -> chips -> card -> data.
      */}
      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="lg:col-start-1 lg:row-start-1">
          {/* Shared, always-mounted map. Only the descriptor swaps per topic. */}
          <ChoroplethMap
            mode={MAP_MODE}
            fillForState={descriptor.fillForState}
            ariaLabelForState={descriptor.ariaLabelForState}
            selectionStroke={descriptor.selectionStroke}
            selectedStates={selectedStates}
            onSelect={selectState}
          />
          <div className="mt-2">
            <MapLegend {...descriptor.legend} />
          </div>
        </div>

        {/* Selection chips — full-width strip under the map, above the data. */}
        <div className={CHIPS_SLOT_CLASS}>
          <ComparingChips
            selectedStates={selectedStates}
            dotColorForState={chipDotColor}
            metaForState={descriptor.metaForState}
            onAdd={selectState}
            onRemove={selectState}
            onClear={clearAll}
            label="Viewing"
          />
        </div>

        {/* Panel identity tracks the active tab. `contents` keeps the tabpanel
            wrapper out of the grid box model so the panel's card/data children
            place directly into the shell grid. */}
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="contents"
        >
          {isEnrollment ? <EnrollmentPanel activeYear={activeYear} /> : <PolicyPanel />}
        </div>
      </div>

      <Footer
        about={footer.about}
        csvText={footer.csvText}
        downloadFilename={footer.downloadFilename}
      />
    </main>
  );
}
