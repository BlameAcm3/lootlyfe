/**
 * Maps Supabase Auth errors to clearer copy for the UI.
 * "Invalid login credentials" is returned for wrong password and for unknown emails.
 */
export const formatAuthError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const raw = String((error as { message: string }).message);

    if (raw === 'Invalid login credentials' || raw.includes('Invalid login credentials')) {
      return 'That email or password does not match our records. If you have not signed up yet, use Create an account. If you just registered, confirm your email from the inbox before signing in.';
    }

    if (raw.toLowerCase().includes('already registered') || raw.toLowerCase().includes('user already')) {
      return 'An account with this email already exists. Use Sign in with the same email and password.';
    }

    if (raw.toLowerCase().includes('email not confirmed')) {
      return 'Please confirm your email address before signing in. Check your inbox for the link from Supabase.';
    }

    return raw;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};
