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

const TABS = [
  { id: "enrollment", label: "Enrollment" },
  { id: "policy", label: "State policies" },
];

// The shared map is sized to a fixed aspect so it stays a consistent height
// across topics and modes (the WordPress iframe must not resize as you click).
const MAP_MAX_WIDTH = "calc(320px * 760 / 460)";

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

      <div className="mt-4">
        <ViewTabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      {/* Section label + year selector (Enrollment only — Regulation has no
          year; the value is preserved and unused while on that tab). */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
          {isEnrollment ? "Enrollment by State" : "Regulation by State"}
        </h2>
        {isEnrollment && (
          <YearSelector
            recentYears={RECENT_YEARS}
            olderYears={OLDER_YEARS}
            activeYear={activeYear}
            onChange={setActiveYear}
          />
        )}
      </div>
      <hr className="mt-3 border-t border-sable/15" />

      {/* Shared, always-mounted map. Only the descriptor swaps per topic. */}
      <div className="mt-3 mx-auto" style={{ maxWidth: MAP_MAX_WIDTH }}>
        <ChoroplethMap
          mode={MAP_MODE}
          fillForState={descriptor.fillForState}
          ariaLabelForState={descriptor.ariaLabelForState}
          selectionStroke={descriptor.selectionStroke}
          selectedStates={selectedStates}
          onSelect={selectState}
        />
      </div>
      <div className="mt-2">
        <MapLegend {...descriptor.legend} />
      </div>

      <ComparingChips
        selectedStates={selectedStates}
        dotColorForState={descriptor.dotColorForState}
        metaForState={descriptor.metaForState}
        onAdd={selectState}
        onRemove={selectState}
        onClear={clearAll}
        label="Viewing"
      />

      {/* Panel identity tracks the active tab. The map/legend/chips above are
          shared, so only this region's content is topic-specific. */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="mt-5"
      >
        {isEnrollment ? <EnrollmentPanel activeYear={activeYear} /> : <PolicyPanel />}
      </div>

      <Footer
        about={footer.about}
        csvText={footer.csvText}
        downloadFilename={footer.downloadFilename}
      />
    </main>
  );
}
