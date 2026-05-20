// Standard shadcn className helper: merges Tailwind classes, dedupes
// conflicting utilities (e.g. p-2 vs p-4), and supports conditional values.
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
