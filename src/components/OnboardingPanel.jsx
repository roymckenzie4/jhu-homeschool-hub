/**
 * OnboardingPanel — the 0-selected introduction shown in the data zone.
 *
 * Stands in for the table/trend row (Enrollment) or the comparison table
 * (Regulation) before any state is picked, so the empty state reads as a
 * deliberate welcome, not blank scaffolding. Context first (what this tool is
 * and why the picture is partial), then the how-to steps — matching the
 * "context before instructions" review note.
 *
 * Shared verbatim by both topic panels: the copy is general to the whole tool,
 * and it lives in the data zone (already a reserved height) so it costs no extra
 * frame height and vanishes on first selection. All wording here is placeholder
 * pending JHU's own copy.
 */

// Name of the searchable add-state control in the chip row, styled to match how
// it reads on screen so the step points at a real affordance.
function AddStateControl() {
  return <span className="font-medium text-sable/80">+ add state</span>;
}

// How-to steps. Titles are the instruction (bold in render); the detail line
// under each is the quiet elaboration. Order tracks a first-run path: pick a
// state (either way), add more, then move between topics.
const STEPS = [
  {
    title: "Select a state",
    detail: (
      <>
        Click it on the map, or use <AddStateControl /> to search by name.
      </>
    ),
  },
  {
    title: "Add more to compare",
    detail: "Line up to six states side by side, the same two ways.",
  },
  {
    title: "Switch topics with the tabs",
    detail: "Move between enrollment counts and state regulation.",
  },
];

export default function OnboardingPanel() {
  return (
    <div className="flex h-full min-h-full flex-col justify-center gap-6 py-2 lg:flex-row lg:items-stretch lg:gap-10">
      {/* Context — reads first (left on lg, top on mobile). */}
      <div className="lg:w-[45%]">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-widest text-heritage">
          About this tool
        </p>
        <p className="mt-2.5 max-w-prose font-sans text-[15px] leading-relaxed text-sable">
          Homeschooling has grown sharply over the past decade, but no single
          national source tracks it — states report enrollment and regulate
          homeschooling differently, and many don&rsquo;t report at all. This
          tool gathers the available state-by-state picture into one place.
        </p>
      </div>

      {/* Divider — vertical rule on lg, horizontal on mobile. */}
      <div className="border-t border-sable/10 lg:border-l lg:border-t-0" />

      {/* How to use — the bold instructions, as a numbered mini-walkthrough. */}
      <div className="lg:flex-1">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-widest text-sable/70">
          How to use it
        </p>
        <ol className="mt-3 space-y-2.5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-heritage font-sans text-[11px] font-bold leading-none text-white"
              >
                {i + 1}
              </span>
              <span className="font-sans text-sm leading-snug">
                <span className="font-semibold text-sable">{step.title}</span>
                <span className="mt-0.5 block text-xs text-sable/60">
                  {step.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
