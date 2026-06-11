import * as Linking from 'expo-linking';

import { supabase } from '@/shared/lib/supabase';

// Deep link back into the app after email verification:
// lootlyfe://auth/callback in builds, exp://.../--/auth/callback in Expo Go.
// Must be allowlisted under Auth > URL Configuration in the Supabase dashboard.
const emailRedirectTo = () => Linking.createURL('auth/callback');

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: emailRedirectTo() },
  });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signInWithMagicLink = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: emailRedirectTo(),
    },
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
