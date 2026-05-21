# JHU Homeschool Hub — State Enrollment Dashboard

An interactive prototype of a single-page dashboard for the Johns Hopkins
University Homeschool Hub team. It visualizes state-level homeschool
enrollment from the Hub's published CSV: a US choropleth map, a detail card
for the selected state, a five-year sparkline, and a year-by-year table.

The only interactive surface is click-to-select on the map. The year
selector, "Compare states," and "Download data" controls render as ghosted
UI; they're scoped for a later phase. See
[What's intentionally not wired up](#whats-intentionally-not-wired-up) below.

**Live demo:** https://roymckenzie4.github.io/jhu-homeschool-hub/

## Stack

- **Vite** for the build, **React** (plain JSX — no TypeScript) for the UI.
- **Tailwind CSS** (v3) with a small set of **shadcn/ui** primitives
  (`Button`, `Card`, `Table`) copied into `src/components/ui/`.
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
    ├── components/ui/             shadcn primitives (Button, Card, Table)
    ├── config/
    │   ├── theme.js               Colors, durations, dimensions
    │   └── states.js              Postal ↔ full name ↔ slug ↔ FIPS table
    ├── data/
    │   ├── parseCsv.js            Wide CSV → shaped objects
    │   └── derive.js              Totals, reporting count, rankings
    ├── lib/geoProjection.js       Memoized albersUsa projection
    └── styles/index.css           Tailwind directives
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

The mockup includes a few controls that render but don't do anything yet.
These are scoped to a later phase:

- **Year selector** — 2020-21 through 2024-25 render, with 2024-25 active.
  Clicking other years no-ops. The data layer already shapes data by year,
  so wiring this is mostly view-state plumbing.
- **Compare states** button — ghosted. Needs UX design first.
- **Download data (CSV)** button — ghosted. Trivial to wire up; left out
  of the prototype to keep the scope focused on the core interaction.

The map intentionally has no hover tooltip — only a subtle hover affordance
(stroke lightens, cursor changes). Click-to-select is the only interaction.

## Planned upgrades (Phase 1)

- **Tailwind v3 → v4.** Scaffolded on v3.4 to avoid visual-regression risk
  during the prototype. v4 is the current major and what modern shadcn
  aligns to.
- **WCAG 2.1 AA pass.** The prototype includes keyboard navigation and
  focus rings on the map. A full audit (contrast, screen-reader landmarks,
  table semantics, motion-reduce) is Phase 1 scope.
- **Wire up the year selector and Compare states.** Both render today as
  ghosted UI.
