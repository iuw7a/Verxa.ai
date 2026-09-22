/**
 * Verxa backend configuration for the mobile app.
 *
 * API_BASE points at the deployed verxa.de backend so Expo Go over tunnel
 * works with zero configuration — the phone talks to the same API the web
 * app uses (same accounts, same chats, same generation endpoints).
 */
export const API_BASE = "https://www.verxa.de";

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://ygzauyrovrcidtcqpyjh.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
