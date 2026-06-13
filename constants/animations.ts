import burst from '../assets/animations/burst.json';
import sparkle from '../assets/animations/sparkle.json';

/**
 * Centralized Lottie sources (mirrors the constants/images.ts rule).
 * Placeholder geometry until real celebration animations land — same file
 * names, so swapping art touches nothing else.
 */
export const animations = {
  /** Level-up celebration: expanding rings. */
  burst,
  /** Quest-complete reward sparkle. */
  sparkle,
} as const;
