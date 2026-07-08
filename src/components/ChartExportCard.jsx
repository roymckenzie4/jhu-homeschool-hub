/**
 * ChartExportCard — the standalone artifact captured when a user downloads a
 * chart as PNG.
 *
 * A downloaded graph gets detached from the site and republished (journalists /
 * advocates pulling it into articles and reports), so this card carries its own
 * provenance: a Homeschool Hub kicker, a title + subtitle naming the metric and
 * scope, an optional color key, the chart, and a source citation. Rendered at a
 * fixed size off-screen (see EnrollmentPanel) and snapshotted by exportImage —
 * so it never touches the live layout; promoting it on-page later is just a
 * matter of rendering it visibly.
 *
 * Props:
 *   title, subtitle  strings — what the chart shows and its scope.
 *   legend           ReactNode — optional color key (comparison mode).
 *   citation         string — the baked-in source line.
 *   chartHeight      number | null — fixed height for the chart area. Recharts
 *                    (Sparkline/ComparisonTrend) needs a bounded height; the map
 *                    sizes itself by aspect ratio, so it passes null to let the
 *                    content define its own height.
 *   children         the chart (or map + legend), filling the chart area.
 */

// Fixed export geometry. Wide enough for a legible multi-line trend; the chart
// area is a comfortable landscape proportion for slides/articles.
const EXPORT_WIDTH = 920;
const DEFAULT_CHART_HEIGHT = 380;

export default function ChartExportCard({
  title,
  subtitle,
  legend,
  citation,
  chartHeight = DEFAULT_CHART_HEIGHT,
  children,
}) {
  return (
    <div style={{ width: EXPORT_WIDTH }} className="bg-white p-8 font-sans text-sable">
      <p className="text-[11px] font-bold uppercase tracking-widest text-heritage">
        Johns Hopkins University &middot; Homeschool Hub
      </p>
      <h3 className="mt-2 text-2xl font-bold leading-tight">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-sable/60">{subtitle}</p>}

      {legend && <div className="mt-4">{legend}</div>}

      <div className="mt-4" style={chartHeight ? { height: chartHeight } : undefined}>
        {children}
      </div>

      <p className="mt-5 border-t border-sable/15 pt-3 text-[11px] leading-relaxed text-sable/50">
        {citation}
      </p>
    </div>
  );
}
