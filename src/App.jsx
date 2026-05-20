/**
 * App root.
 *
 * Stage 1: only renders the eyebrow line so we can eyeball the Google Fonts
 * load (Roboto Slab for the eyebrow, Work Sans for everything else). The
 * placeholder body text below uses Work Sans so we can confirm both faces
 * are loading in a single glance.
 */
export default function App() {
  return (
    <main className="mx-auto max-w-5xl px-8 py-12">
      <p className="font-slab text-xs uppercase tracking-[0.18em] text-sable">
        Johns Hopkins University · Homeschool Hub
      </p>

      <p className="mt-8 font-sans text-sm text-sable/70">
        Stage 1 — toolchain check. Body text is Work Sans; the eyebrow above is
        Roboto Slab. If both render correctly, fonts are wired up.
      </p>
    </main>
  );
}
