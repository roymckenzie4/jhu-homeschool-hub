# JHU Homeschool Hub — State Data Dashboard

An interactive single-page dashboard for the Johns Hopkins University
Homeschool Hub team. One tool, two topics behind a tab switcher:

- **Enrollment** — a US choropleth shaded by reported homeschool enrollment,
  a year selector, a national overview, single-state detail (headline number,
  year-over-year change, national rank, full trend history), and side-by-side
  comparison of up to six states (multi-line trend + year-by-year table).
- **Regulation** — the same map recolored by how many of 10 tracked
  homeschool regulations each state enforces (Low/Medium/High), with the same
  single-state and up-to-six comparison modes, source-linked requirements, and
  compulsory-schooling/legalization context per state.

Both topics share one map, one state-selection cohort, and one visual system —
selecting states on Enrollment and switching to Regulation keeps the same
states selected. Every chart and the map itself can be downloaded as a
citation-stamped PNG; the underlying data can be downloaded as CSV from the
footer.

**Live demo:** https://roymckenzie4.github.io/jhu-homeschool-hub/

## Stack

- **Vite** for the build, **React** (plain JSX — no TypeScript, by design, so
  the code stays readable without frontend-specialist knowledge) for the UI.
- **Tailwind CSS** (v4, CSS-first `@theme` config in `src/styles/index.css` —
  no `tailwind.config.js`) with a small set of **shadcn/ui** primitives
  (`Card`, `Table`, `Select`, `Popover`, `Command`, `Tooltip`) copied into
  `src/components/ui/`.
- **d3-geo** + **topojson-client** + **us-atlas** for the choropleth map
  projection. Quarantined to `ChoroplethMap.jsx` and `lib/geoProjection.js` —
  it draws the map, not the charts.
- **Recharts** for every chart (the trend lines). One charting library only,
  by design — mixing visualization libraries produces inconsistent results.
- **html-to-image** for the PNG export of charts, the map, and the regulation
  comparison table.
- **d3-dsv** for CSV parsing; **xlsx** (SheetJS) to read JHU's enrollment
  workbook at build time only — never shipped to the browser.

Everything ships as a static site: no backend, no database, no recurring
hosting cost. GitHub Pages serves the built `dist/` directory for free.

## Run locally

Requires Node 20 or newer.

```bash
npm install
npm run dev
```

Vite prints a local URL (typically `http://localhost:5173/jhu-homeschool-hub/`).
Open it in a browser. The dev server hot-reloads on file changes.

Other commands:

```bash
npm run build          # Production build in dist/
npm run preview        # Serves the built dist/ for local smoke-testing
npm run audit:contrast # Scans the source for text-color contrast failures
npm run audit:a11y     # Automated accessibility scan (needs `npm run preview` running first)
```

## Deploy

Deployment is automated. Push to the `main` branch and GitHub Actions
(`.github/workflows/deploy.yml`) builds the site and publishes it to GitHub
Pages at `https://<your-username>.github.io/jhu-homeschool-hub/`.

One-time setup on a fresh repo:

1. In the GitHub repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Add a repository secret named `SHEETS_API_KEY` (see [Updating the
   data](#updating-the-data) below) — both topics' live data depend on it.

The workflow also runs automatically every Monday (and on-demand via the
Actions tab's "Run workflow" button) to refresh the live data snapshots even
on weeks with no code changes — see below.

The base path is set in `vite.config.js` and must match the repo name. If the
repo is ever renamed or transferred to a different GitHub org/name, update
`base` there.

**Optional analytics:** the site can send page/usage events to Google
Analytics 4, but ships with it off. To enable, set a `VITE_GA_ID` repository
variable (Settings → Secrets and variables → Actions → Variables) to a GA4
Measurement ID; leave it unset to track nothing. See `src/lib/analytics.js`.

## Updating the data

Each topic has **two data sources**: a **live snapshot** fetched from JHU's
real source at build time (the source of truth when present), and a
**bundled CSV** kept as a fallback. A loader module (`enrollmentLoader.js` /
`regulationLoader.js`) prefers the snapshot and falls back to the CSV, so the
site can't break if a snapshot is ever missing or malformed. The CSV also
backs each footer's "Download data (CSV)" button.

**The snapshots refresh automatically — most of the time, nobody needs to
touch this repo when JHU updates their source.** Every push to `main`, plus a
weekly scheduled run (Mondays), re-fetches both sources and rebuilds the site.
This needs the `SHEETS_API_KEY` repository secret (already configured).

| Topic | Live source | Snapshot file | Fetch script |
|---|---|---|---|
| Enrollment | JHU's `.xlsx` workbook in Google Drive, tab `All States` | `src/data/enrollment-snapshot.json` | `scripts/fetch-enrollment-snapshot.mjs` |
| Regulation | JHU's Google Sheet, `Heat Map` + `Legislation` tabs | `src/data/policy-snapshot.json` | `scripts/fetch-policy-snapshot.mjs` |

Both scripts share `scripts/lib/sheets.mjs` (the fetch plumbing, the API key,
and the "don't overwrite a good snapshot with a bad fetch" safety check). To
refresh a snapshot by hand, put the API key in `.env.local` (see
`.env.local` — gitignored, never committed) and run:

```bash
node --env-file=.env.local scripts/fetch-enrollment-snapshot.mjs
node --env-file=.env.local scripts/fetch-policy-snapshot.mjs
```

**To update the bundled CSV fallback** (only matters if the live source is
ever unreachable for an extended time): replace
`homeschool-hub-state-summary-data.csv` (enrollment) or
`homeschool-hub-policy-data.csv` (regulation) at the repo root, keeping the
exact published format — enrollment is **wide** (one column per state, one
row per school year); regulation is **one row per state** — then
`npm run build` and commit.

Notes worth knowing:

- **The enrollment source is an uploaded Excel file, not a native Google
  Sheet**, so the fetch script downloads it whole via the Drive API and reads
  it with SheetJS. This needs the **Drive API enabled** on the API key's
  Google Cloud project. As long as JHU **updates the file in place** (uploads
  a new version to the same Drive file), its Drive file ID stays stable and
  nothing here needs to change. **If the file is ever deleted and
  re-uploaded** (rather than updated in place), its ID changes — update the ID
  at the top of `scripts/fetch-enrollment-snapshot.mjs`.
- **The regulation source's per-cell source links** (each Yes/No cell in the
  comparison table can link to the statute) only exist because the Sheets API
  returns the full cell model, not just values — a plain CSV export of that
  sheet would silently drop them. If JHU ever needs a "governance" contract
  for that sheet (who can edit which columns), the column headers matter:
  `parseHeatMapData.js` and `parseLegislationData.js` read cells by their
  header text, so renaming a header column breaks the parser for that column
  until the parser or the header is fixed.
- **Empty cells become `null`, not `0`** — this preserves the "does not
  publicly report" signal on the map (a real zero and "no data" must stay
  visually distinct).
- **In-flight/partial school years are dropped** during parsing rather than
  shown as a misleadingly low number — see the relevant comment in
  `parseCsv.js` if that cutoff behavior ever needs to change.
- **Year-over-year percentages and national rankings are computed from the
  data at render time** — they are not stored anywhere, so they're always
  consistent with whatever the current snapshot says.
- **Each fetch script refuses to overwrite a good snapshot** if the fetch
  fails outright or the source's shape looks wrong (e.g. far fewer states
  than expected) — so a transient outage or a malformed upstream edit can
  never blank out the live site. It just keeps serving the last good
  snapshot until the next successful fetch.

## Project layout

```
.
├── .github/workflows/deploy.yml     GitHub Actions: fetch snapshots, build, deploy
├── homeschool-hub-state-summary-data.csv   Enrollment source data (wide format, as published)
├── homeschool-hub-policy-data.csv   Regulation source data (as published)
├── public/us-states-10m.json        TopoJSON for the US map
├── public/new/index.html            Redirect stub for an old preview URL
├── vite.config.js                   Build config; sets the GH Pages base path
├── scripts/                         Build-time data-fetch scripts (see above)
└── src/
    ├── App.jsx                      The unified shell: tabs, shared map/legend/chip row, layout
    ├── main.jsx                     React entry point
    ├── topics/                      Per-topic "descriptors" the shell renders (map coloring, legend, footer copy)
    ├── state/selection.jsx          Shared cross-topic state-selection context
    ├── components/                  Cards, tables, charts, buttons — one file per component
    ├── components/ui/               shadcn primitives (Card, Table, Select, Popover, Command, Tooltip)
    ├── config/                      All tunable values: colors, dimensions, state list, regulation list — nothing scattered
    ├── data/                        Loaders + parsers; the only code that touches raw CSV/snapshot shapes
    ├── lib/                         Small shared helpers (formatting, PNG export, chart math, analytics)
    └── styles/index.css             Tailwind import + CSS-first @theme tokens (brand colors, fonts)
```

## Where things live (for non-frontend maintainers)

If you're maintaining this codebase and need to change something common,
here's where to look — **all configuration lives in `src/config/`, nothing
is scattered through the component files:**

| You want to change…                                  | Edit                                          |
| ------------------------------------------------------ | ---------------------------------------------- |
| A brand color, transition duration, or citation wording | `src/config/theme.js`                          |
| A state's URL slug, full name, or postal abbreviation   | `src/config/states.js`                         |
| The list of tracked regulations or level thresholds     | `src/config/regulation.js`                     |
| How many states can be compared at once                 | `COMPARE_CAP` in `src/config/selection.js`     |
| Fixed layout heights (the WordPress iframe target)      | `src/config/layout.js`                         |
| How the enrollment CSV/workbook is parsed               | `src/data/parseCsv.js`                         |
| How the regulation CSV/sheet is parsed                  | `src/data/parseRegulationCsv.js`, `parseHeatMapData.js`, `parseLegislationData.js` |
| The deployed URL or base path                           | `base` in `vite.config.js`                     |
| Enrollment-tab-specific colors, legend, or footer copy  | `src/topics/enrollmentTopic.jsx`               |
| Regulation-tab-specific colors, legend, or footer copy  | `src/topics/regulationTopic.jsx`               |

## Adding a new chart

This project uses the [shadcn-charts](https://ui.shadcn.com/charts) pattern —
wrapper components in `src/components/ui/chart.jsx` that render Recharts
under the hood. `Sparkline.jsx` and `ComparisonTrend.jsx` are the two existing
charts; `lib/trendChart.js` holds the axis/domain math they both share (note:
Recharts requires `XAxis`/`YAxis`/`ReferenceLine` as literal direct children
of a chart component, so the JSX itself can't be extracted into a shared
wrapper — only the plain data math can be). Use either as a reference, and
keep any new chart on Recharts, per the project's one-charting-library rule.

## Accessibility

An accessibility pass (contrast, keyboard navigation, screen-reader table
semantics and landmarks) is done — see `npm run audit:contrast` and
`npm run audit:a11y` above, which are meant to be re-run after future visual
changes so regressions get caught automatically rather than by eyeballing.
This is a self-scoped pass at known/common issues, not a certified WCAG 2.1 AA
compliance audit — a full compliance claim would need a commissioned
human/assistive-tech audit, which is a separate decision from building this
tooling.

## Known limitations

- **Not yet responsive for mobile/narrow screens** — built desktop-first so
  far; the comparison table in particular will need a real mobile strategy.
- **The iframe height is provisional** (`config/layout.js`) pending JHU's
  real WordPress embed dimensions.
- **The exported map PNG doesn't show the "dim the non-selected states"
  effect** that the live map does — `html-to-image` doesn't carry that CSS
  rule into its off-screen clone. The export still shows the correct
  selection border.
- **Regulation has no per-state comparison drill-in** the way Enrollment does
  (Enrollment's comparison table has a "View detail →" per row; Regulation's
  does not yet).
