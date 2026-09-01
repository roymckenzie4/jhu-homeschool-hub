/**
 * Shared constants for the cross-topic state-selection cohort — the map click,
 * the "+ add state" control, and the comparison chip row all read from here.
 * Topic-agnostic: neither Enrollment nor Regulation owns this, so it doesn't
 * live in either topic's config file.
 */

// Maximum number of states that can be compared at once. Single source of
// truth — the map toggle, the chip row, and the comparison tables all read this.
export const COMPARE_CAP = 6;
