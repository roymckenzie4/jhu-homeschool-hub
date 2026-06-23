# JHU Homeschool Hub — State Enrollment Dashboard

An interactive single-page dashboard for the Johns Hopkins University
Homeschool Hub team. It visualizes state-level homeschool enrollment from
the Hub's published CSV: a US choropleth map, a detail card for the selected
state, a sparkline of the state's full reporting history, and a year-by-year
table.

Interactive surfaces: click-to-select on the map, a year selector that
drives every panel, and a footer "Download data (CSV)" button. "Compare
states" still renders as ghosted UI, pending design. See
[What's intentionally not wired up](#whats-intentionally-not-wired-up) below.

**Live demo:** https://roymckenzie4.github.io/jhu-homeschool-hub/

## Stack

- **Vite** for the build, **React** (plain JSX — no TypeScript) for the UI.
- **Tailwind CSS** (v4, CSS-first `@theme` config — no `tailwind.config.js`)
  with a small set of **shadcn/ui** primitives (`Card`, `Table`, `Select`)
  copied into `src/components/ui/`.
- **d3-geo** + **topojson-client** + **us-atlas** for the choropleth map.
  Quarantined to one component (`ChoroplethMap.jsx`) and one helper
  (`lib/geoProjection.js`).
- **Recharts** for the sparkline, via the shadcn-charts wrapper pattern.
  Only one charting library is used across the project.
- **d3-dsv** for CSV parsing.

Everything ships as a static site. No backend, no database, no recurring
hosting cost — GitHub Pages serves the built `dist/` directory for free.

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
npm run build      # Produces a production build in dist/
npm run preview    # Serves the built dist/ for local smoke-testing
```

## Deploy

Deployment is automated. Push to the `main` branch and GitHub Actions
builds the site and publishes it to GitHub Pages.

One-time setup on a fresh repo:

1. In the GitHub repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

That's it. After the first push to `main`, the workflow at
`.github/workflows/deploy.yml` runs and the site is live at
`https://<your-username>.github.io/jhu-homeschool-hub/` within a minute or two.

The base path is configured in `vite.config.js` and must match the repo
name. If the repo is ever renamed, update `base` in that file.

## Updating the data

The source of truth is `homeschool-hub-state-summary-data.csv` at the repo
root. It's stored in the exact wide format published by the Homeschool Hub:
column one is the school year, every other column is a state, and cells
are reported enrollment counts (empty when a state doesn't publicly report).

To update with a new year's data:

1. Replace `homeschool-hub-state-summary-data.csv` with the latest file.
2. Run `npm run build` and confirm no warnings.
3. Commit and push to `main`. The deploy workflow handles the rest.

A few parsing notes worth knowing:

- `src/data/parseCsv.js` pivots the wide CSV into an internal shape
  (`{ stateName: { year: value } }`) that the components consume.
- Empty cells become `null`, not `0` — this preserves the
  "does not publicly report" signal on the map.
- In-flight school years (e.g. a partial `2025-2026` row) are dropped
  during parsing. The dropped year is logged with a comment in
  `parseCsv.js`.
- Year-over-year percentages and national rankings are derived from the
  data at render time, not stored in the CSV.

## Project layout

```
.
├── .github/workflows/deploy.yml   GitHub Actions Pages deploy
├── homeschool-hub-state-summary-data.csv   Source data (wide format, as published)
├── public/us-states-10m.json      TopoJSON for the US map (~110KB)
├── vite.config.js                 Build config; sets the GH Pages base path
└── src/
    ├── App.jsx                    Top-level layout; owns selectedState
    ├── main.jsx                   React entry point
    ├── components/                Header, ChoroplethMap, StateDetailCard, etc.
    ├── components/ui/             shadcn primitives (Card, Table, Select, chart)
    ├── config/
    │   ├── theme.js               Colors, durations, dimensions
    │   └── states.js              Postal ↔ full name ↔ slug ↔ FIPS table
    ├── data/
    │   ├── parseCsv.js            Wide CSV → shaped objects
    │   └── derive.js              Totals, reporting count, rankings
    ├── lib/geoProjection.js       Memoized albersUsa projection
    └── styles/index.css           Tailwind import + CSS-first @theme tokens
```

## Where things live (for non-frontend maintainers)

If you're maintaining this codebase and need to change something common,
here's where to look:

| You want to change…                        | Edit                                |
| ------------------------------------------ | ----------------------------------- |
| A color, transition duration, or dimension | `src/config/theme.js`               |
| A state's URL slug or full name            | `src/config/states.js`              |
| How the CSV is parsed                      | `src/data/parseCsv.js`              |
| The "last updated" footer label            | `LAST_UPDATED` in `config/theme.js` |
| The deployed URL or base path              | `base` in `vite.config.js`          |

All configuration is in `src/config/`. No values are scattered through
the component files.

## Adding a new chart in Phase 2

This project uses the [shadcn-charts](https://ui.shadcn.com/charts)
pattern: wrapper components (`ChartContainer`, `ChartTooltipContent`, etc.)
copied into `src/components/ui/` that render Recharts under the hood.

To add a new chart, follow the shadcn docs and use the existing
`Sparkline.jsx` as a reference. Keep all charts on Recharts — per the
project's design guidelines, mixing visualization libraries produces
inconsistent visual results.

## What's intentionally not wired up

One control still renders without behavior, pending design:

- **Compare states** button — ghosted. Needs UX design first. (The State
  policies view planned for Phase 1 is built around multi-state comparison,
  so this may be folded into that work.)

The map intentionally has no hover tooltip — only a subtle hover affordance
(stroke lightens, cursor changes). Click-to-select is the only map interaction.

## Planned work (Phase 1)

- **State policies view.** A second view (tabbed alongside Enrollment) that
  shades each state by how many of 10 tracked homeschool regulations it
  enforces, with side-by-side comparison of multiple states. Awaiting the
  policy dataset from JHU.
- **WCAG 2.1 AA pass.** The dashboard includes keyboard navigation and
  focus rings on the map. A full audit (contrast, screen-reader landmarks,
  table semantics, motion-reduce) is Phase 1 scope.
- **Wire up Compare states**, or supersede it with the State policies view.
