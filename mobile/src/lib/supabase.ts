import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

function makeClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  // Node/SSR guard: Expo CLI server-renders the web bundle when a plain
  // browser request hits the dev server root. AsyncStorage's web impl needs
  // `window`, so only initialize a real client in a JS runtime that has one.
  if (typeof window === "undefined") return null;
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = makeClient();

/** Lazy accessor for code paths that may run during web SSR. */
export function getSupabase(): SupabaseClient | null {
  return supabase ?? makeClient();
}
