import type { PostgrestError } from '@supabase/supabase-js';

/** Human-readable message from Supabase / PostgREST errors (shown in UI). */
export const formatSupabaseError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as PostgrestError;
    const parts = [e.message, e.details, e.hint].filter(
      (x): x is string => typeof x === 'string' && x.length > 0,
    );
    if (parts.length > 0) return parts.join(' ');
  }
  return 'Something went wrong. Try again.';
};
