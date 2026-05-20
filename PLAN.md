# Homeschool Hub Data Tool — Plan

> Living planning doc. Update as decisions evolve. Mirrors CLAUDE.md (project context, constraints, design rules); this file is the *implementation* plan.

## Context

JHU's Homeschool Hub team needs an interactive prototype as part of a $26K consulting pitch. The prototype demonstrates Phase 1 polish: a state-level homeschool enrollment dashboard built from the published `homeschool-hub-state-summary-data.csv`. It must be:

- Frontend-only, static, deployable to GitHub Pages
- Zero recurring cost
- Lightweight and fast-loading
- Enterprise-polished (this is the differentiator vs the competing firm)
- Maintainable by JHU staff who are not frontend specialists
- Ready to grow into the real Phase 1 codebase if we win the contract

The locked design is `mockup.png`. The only interactive surface in this prototype is click-to-select on the map; everything else is ghosted/visual-only per CLAUDE.md.

## Stack (locked)

- **Build tool:** Vite (static output, configurable `base` for GitHub Pages)
- **Framework:** React (JSX, no TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui primitives (button, card, table)
- **Fonts:** Work Sans (body/UI/headings) and Roboto Slab (eyebrow only), loaded from Google Fonts
- **Map:** `d3-geo` + `topojson-client` + `us-atlas` TopoJSON, rendered as a custom React SVG component. `geoAlbersUsa` projection handles AK/HI inset natively. d3-geo usage is quarantined to one component + one helper module.
- **Sparkline / future charts:** shadcn-charts on top of Recharts. shadcn-charts isn't a separate dep — it's a set of wrapper components (`ChartContainer`, `ChartTooltipContent`, etc.) copy-pasted into `src/components/ui/` via `npx shadcn@latest add chart`. Recharts is the runtime engine; shadcn-charts gives us themed defaults via CSS variables, tooltip/legend styling that matches the rest of the UI, and source-owned wrappers (no library lock-in). Sole "charting library" per CLAUDE.md's one-library rule; d3-geo is treated as a geo toolkit, not a chart lib.
- **CSV parsing:** `d3-dsv` (~5KB, already in the d3 family, handles quoted comma values correctly)

## Project structure (at repo root)

```
/                                          (repo root)
  CLAUDE.md                                (gitignored, project context)
  PLAN.md                                  (this file, tracked)
  README.md                                (run/deploy/data-update instructions)
  mockup.png                               (design reference, tracked)
  homeschool-hub-state-summary-data.csv    (canonical published data, tracked)
  .gitignore
  package.json
  vite.config.js                           (sets base path for GH Pages)
  tailwind.config.js
  postcss.config.js
  index.html                               (root HTML, links Google Fonts)
  components.json                          (shadcn config)
  public/
    us-states-10m.json                     (TopoJSON, ~110KB; fetched at runtime)
  src/
    main.jsx                               (React entry)
    App.jsx                                (top-level layout & state)
    config/
      theme.js                             (colors, durations, dimensions — single source)
      states.js                            (postal ↔ full name ↔ URL slug ↔ FIPS table)
    data/
      parseCsv.js                          (wide CSV → shaped objects)
      derive.js                            (YoY %, rank, national total, reporting count)
    components/
      Header.jsx                           (eyebrow, headline, subhead)
      YearSelector.jsx                     (renders 2020–2024; only 2024 active)
      ChoroplethMap.jsx                    (d3-geo SVG; quarantined map code)
      MapLegend.jsx                        (color ramp + "Does not publicly report" swatch)
      StateDetailCard.jsx                  (selected state name, total, YoY chip, rank)
      Sparkline.jsx                        (Recharts 5-year trend line)
      EnrollmentTable.jsx                  (5-year table with YoY % column)
      Footer.jsx                           (ghosted action buttons + about copy)
    lib/
      geoProjection.js                     (one tiny helper: build & memoize the projection)
    styles/
      index.css                            (Tailwind directives + font-face fallback)
```

Reasoning: building at the root keeps `npm install && npm run dev` working from a fresh clone and colocates data/docs with source — easiest for JHU handoff.

## Data pipeline

`homeschool-hub-state-summary-data.csv` is imported at build time via Vite's `?raw` suffix (`import csvText from '../homeschool-hub-state-summary-data.csv?raw'`). Canonical file stays at repo root exactly as published; updating data is "replace the file, rebuild." README documents this.

`src/data/parseCsv.js` exports one function that produces two shapes:

```js
// byState — what the detail card, table, and sparkline consume
{
  "Arkansas":   { 2020: 16240, 2021: 18880, 2022: 21430, 2023: 20740, 2024: 22150, ... },
  "California": { 2020: ..., ... },
  ...
}

// byYear — what the headline number, "X of 50" count, and ranking consume
{
  2024: {
    total: 1651510,
    reportingCount: 30,
    rankByState: { "Arkansas": 18, "California": ..., ... }
  },
  ...
}
```

Normalization rules:
- `"35,419"` → `35419` (strip quotes & thousands separators)
- empty/whitespace cells → `null` (preserves "not reporting" signal; never coerced to 0)
- CSV school year `"2024-2025"` → display label `"2024-25"` (abbreviated school-year format, two-digit suffix). Used everywhere a year is shown: headline, year selector, detail card subtitle, table column, sparkline. Internally we still key by the starting year integer (`2024`) for sorting and lookups; the `"2024-25"` string is a display formatter applied at render time.
- The partial `2025-2026` row is dropped during parsing for this prototype, with a comment noting why. README documents that the parser drops in-flight school years.

YoY% is derived inline in the table component from the previous year's value — not precomputed. National rank is computed once per year in `derive.js`.

## State / interaction model

`App.jsx` owns one piece of state: `selectedState` (default `"Arkansas"` per CLAUDE.md). Year is effectively a constant for the prototype (`2024`). The map dispatches selection up; the detail card, table, and sparkline read `selectedState` + the shaped data. Transitions on selection (fill color, stroke, panel content) use 200ms ease, defined as `THEME.transitionMs` in `config/theme.js`.

## Map specifics

- **Projection:** `geoAlbersUsa()` — handles AK & HI inset out of the box. Path generator from `geoPath()`.
- **State geometry:** `us-atlas/states-10m.json` TopoJSON, meshed via `topojson-client`'s `feature()`. Each state feature carries a FIPS code we use to look up postal/name/slug from `config/states.js`.
- **Color ramp:** `d3-scale-chromatic` is *not* needed — we'll build the ramp manually as `interpolateRgb(SPIRIT_BLUE, HERITAGE_BLUE)` from `d3-interpolate` (already pulled in transitively by d3-geo's family; ~2KB). Domain is `[minReporting, maxReporting]` for the selected year.
- **Non-reporting fill:** SVG `<pattern>` with diagonal stripes on a light-gray ground, defined once in `<defs>` and referenced by `fill="url(#non-reporting)"`. Same swatch reused in the legend.
- **Hover affordance:** state path gets a 1px lighter stroke + slight cursor change on `mouseenter` (no tooltip). Implemented as a CSS class toggle so transitions stay GPU-friendly.
- **Selection affordance:** darker stroke + halo (drop-shadow filter) on the selected state, both with 200ms transitions.
- **DC marker:** small circle (~6px radius) at DC's projected coords with a 1px leader line. Fills from the same color ramp, click-selectable like any state, gets the same halo when selected. Lives inside `ChoroplethMap.jsx` alongside the state paths so it shares the projection.
- **Legend:** continuous gradient swatch + min/max labels for reporting states, plus the striped swatch with "Does not publicly report" label. Lives in `MapLegend.jsx`, consumes the same ramp from `config/theme.js`.

## Component contracts

Brief inputs/outputs so the boundaries are clear:

- **Header**: takes `nationalTotal`, `reportingCount`, `totalStates` (50). Renders eyebrow, headline number, subhead.
- **YearSelector**: takes `years`, `activeYear`. Visual only; clicks no-op for now. Labels rendered as `"2020-21"` through `"2024-25"`.
- **ChoroplethMap**: takes `valuesByState` (`{stateName: number|null}`), `selectedState`, `onSelect(stateName)`. Owns all d3-geo code.
- **MapLegend**: takes `min`, `max`. Pure visual.
- **StateDetailCard**: takes `stateName`, `currentValue`, `yoyPct`, `rank`, `reportingCount`, `slug`. Includes the "Read more" link to `https://education.jhu.edu/edpolicy/policy-research-initiatives/homeschool-hub/states/[slug]/`.
- **Sparkline**: takes `series` (array of `{year, value}`). Recharts `LineChart` with no axes/labels.
- **EnrollmentTable**: takes `rows` (5 most recent years, each `{year, value, yoyPct}`). shadcn `<Table>`.
- **Footer**: takes `lastUpdatedLabel`. Ghosted "Compare states" and "Download data (CSV)" buttons; about-this-data paragraph.

## Build stages

Each stage ends on an explicit check-in: I'll stop, show what's working, and we decide together before moving to the next stage. No stage rolls into the next without confirmation.

### Stage 1 — Project skeleton & dev environment
**Goal:** Toolchain runs cleanly end-to-end before any feature work.
**Deliverables:**
- `package.json`, `vite.config.js` (with GH Pages base path), `tailwind.config.js`, `postcss.config.js`, `index.html`
- shadcn initialized (`components.json`, base CSS variables, `cn` util)
- Google Fonts (Work Sans, Roboto Slab) loaded in `index.html`
- `src/config/theme.js` with the JHU palette and timing constants
- `src/main.jsx`, `src/App.jsx` rendering the eyebrow line ("Johns Hopkins University · Homeschool Hub") so we can eyeball the fonts
**Check-in:** `npm run dev` opens clean, fonts visibly correct, no console errors. We confirm before I touch data.

### Stage 2 — Data layer (no UI yet)
**Goal:** Get the numbers right before any component consumes them.
**Deliverables:**
- `src/config/states.js` — postal ↔ full name ↔ URL slug ↔ FIPS for all 50 states + DC
- `src/data/parseCsv.js` — wide CSV → `byState` shape
- `src/data/derive.js` — `byYear` totals, reporting count, rankings
- Temporary debug panel in `App.jsx` showing computed values
**Check-in:** I show the parsed numbers for 2024 — national total, reporting count, Arkansas value, Arkansas rank — against the mockup. We confirm parity before any visualization work.

### Stage 3 — Static layout shells
**Goal:** Composition matches the mockup at the page level, with placeholders where viz goes.
**Deliverables:**
- `Header.jsx` — eyebrow, headline, subhead, using *real* computed numbers from Stage 2
- `YearSelector.jsx` — renders 2020–2024 with 2024 active (visual only)
- `Footer.jsx` — "About this data" copy, ghosted "Compare states" / "Download data (CSV)" buttons
- Empty placeholder boxes (correct dimensions) where map, detail card, table live
**Check-in:** Side-by-side with mockup at desktop width. Spacing, type scale, color of the headline number — all locked before we build into the placeholders.

### Stage 4 — Choropleth map
**Goal:** Map matches the mockup and click-to-select changes app state. No detail card updates yet — selection is just visible on the map.
**Deliverables:**
- `public/us-states-10m.json` (us-atlas TopoJSON)
- `src/lib/geoProjection.js` (memoized albersUsa projection + path)
- `ChoroplethMap.jsx` — state geometry, color ramp, non-reporting stripe pattern, DC marker, hover affordance, click-to-select wired up through `App.jsx`'s `selectedState`
- `MapLegend.jsx` — gradient swatch + non-reporting swatch
- Selection halo + 200ms transitions on fill/stroke
**Check-in:** Map visually matches the mockup (incl. DC marker and legend). Click any state → it visibly becomes the selected one. Click a non-reporting state → behavior decided here (silent vs. "no data" indicator).

### Stage 5 — Detail card, table, sparkline
**Goal:** All three right-side / below-map panels driven by `selectedState`.
**Deliverables:**
- `StateDetailCard.jsx` — state name, current value, YoY chip (gold/red), rank, "Read more →" link with correct slug
- `EnrollmentTable.jsx` — 5 most recent years with YoY % column, shadcn `<Table>`
- shadcn-charts installed (`npx shadcn@latest add chart`) and themed against `theme.js`
- `Sparkline.jsx` — bare line, no axes/grid/tooltip/dots, JHU blue
**Check-in:** Arkansas default state matches the mockup exactly (22,150 / +6.8% / 18th of 30 / 5-year trend / table values). Clicking other states updates all three panels with no flicker.

### Stage 6 — Polish & transitions
**Goal:** It feels like enterprise-quality work, not a prototype.
**Deliverables:**
- 200ms ease transitions wired consistently (map fill, stroke, halo, panel content swap)
- Keyboard nav: every interactive element reachable via Tab with visible focus rings
- Responsive collapse at Tailwind `lg`: single column in sequence headline → map → detail card → table → footer
- Console clean of React warnings; no missing `key` props; no a11y regressions in basic keyboard nav
**Check-in:** Demo the interactive feel. Resize the window. Tab through. We sign off on polish before I write README and deploy config.

### Stage 7 — Build, deploy, README
**Goal:** Static build deploys to GitHub Pages, and JHU staff can pick this up cold.
**Deliverables:**
- `vite.config.js` base path verified against the actual repo name
- `npm run build` produces clean `dist/`; `npm run preview` matches dev
- `README.md` — project overview, run locally, deploy, data location, how to update data when new years are published, where colors/constants live, how to add a chart in Phase 2
- End-to-end verification checklist (below) run top to bottom
**Check-in:** Production build smoke test, README read-through. Then prompt you to commit.

## Assumptions I'm making — flag now if any are wrong

- **Display-year convention**: CSV `2024-2025` → UI label `2024-25` (school-year abbreviated). Single formatter in `config/theme.js` so it's swappable in one place if you want to change it later.
- **"Last updated March 2026"** footer is hardcoded for now in a `LAST_UPDATED` constant in `config/theme.js`. Easy to change.
- **2025-2026 partial row** is dropped during parsing.
- **Headline copy** matches the mockup but with the school-year label: "In 2024-25, at least 1,651,510 students were reported as homeschoolers in the United States." The number and the "30 of 50" count are computed from the CSV; the rest is static.
- **Responsive collapse breakpoint**: Tailwind `lg` (1024px). Below that, single column in sequence: headline → map → detail card → table → footer (per CLAUDE.md).

## What is NOT wired (intentional, per CLAUDE.md)

- Year selector buttons render with 2024 active; other years are visual only.
- "Compare states" and "Download data (CSV)" are ghosted/non-functional.
- No hover tooltips on the map (only a subtle hover-state visual).

## Verification

End-to-end manual smoke before reporting done:

1. `npm install && npm run dev` from repo root → opens at localhost without console errors or React warnings.
2. Arkansas is selected on load. Detail card reads "Arkansas / 22,150 / +6.8% / 18th of 30" with the year subtitle "2024-25". Sparkline shows 5 points trending up. Table shows school years 2020-21 through 2024-25 with YoY values matching the detail card for 2024-25.
3. Click another reporting state (e.g., California) → fill darkens, halo appears, detail card / sparkline / table update with a smooth 200ms transition.
4. Click a non-reporting state (e.g., Idaho) → it's striped on the map and either not clickable or shows a "no data reported" state in the detail card. Decide which during build.
5. Click the DC marker → selection works just like a state.
6. "Read more about homeschool context in California →" link points to `https://education.jhu.edu/edpolicy/policy-research-initiatives/homeschool-hub/states/california/`.
7. Resize browser to <1024px → layout collapses to the documented single-column sequence.
8. `npm run build && npm run preview` → static build serves identically to dev.
9. No console errors, no React `key`/prop warnings, keyboard `Tab` reaches every interactive element with visible focus rings.

## Open questions (small, can be resolved during build)

- Behavior when a non-reporting state is clicked: silent no-op vs. "no data" state in detail card?
- Exact size/placement of the DC marker — will dial in against the mockup once map is rendering.
