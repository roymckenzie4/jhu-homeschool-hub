/**
 * App root — page shell + tab switcher.
 *
 * The prototype now has two self-contained views: the homeschool-enrollment
 * dashboard (EnrollmentView) and the regulation comparison (PolicyView). App
 * holds only the page shell (max width, padding), the tab bar, and which view
 * is active. Each view owns its own data, header, and interactive state.
 *
 * The toggle is deliberately lightweight. If JHU later wants to embed each
 * view at its own WordPress URL, this is the seam to swap for a hash router —
 * a localized change, since the views are already standalone components.
 */

import { useState } from "react";
import ViewTabs from "./components/ViewTabs.jsx";
import EnrollmentView from "./components/EnrollmentView.jsx";
import PolicyView from "./components/PolicyView.jsx";
import { trackEvent } from "./lib/analytics.js";

const TABS = [
  { id: "enrollment", label: "Enrollment" },
  { id: "policy", label: "State policies" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("enrollment");

  // Toggle instead of a router, so each switch has to be sent as its own event
  // for view usage to show up in analytics.
  function handleTabChange(id) {
    setActiveTab(id);
    trackEvent("tab_switch", { view: id });
  }

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-4 lg:px-12 lg:py-6">
      <ViewTabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="mt-4"
      >
        {activeTab === "enrollment" ? <EnrollmentView /> : <PolicyView />}
      </div>
    </main>
  );
}
