// Standard shadcn className helper: merges Tailwind classes, dedupes
// conflicting utilities (e.g. p-2 vs p-4), and supports conditional values.
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// True when this page is rendered inside an iframe (the WordPress embed) —
// a cross-origin iframe throws reading window.top, so wrapped in a try/catch
// rather than trusting the direct comparison always succeeds.
export function isIframed() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
