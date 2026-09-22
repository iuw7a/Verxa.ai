/** Email preferences + marketing-consent storage (Supabase). */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "./config";

export type EmailPreferences = {
  user_id: string;
  email: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  marketing_consent_source: string | null;
  marketing_unsubscribed_at: string | null;
  product_updates: boolean;
  newsletters: boolean;
  tips_tutorials: boolean;
  new_features: boolean;
  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_PREFERENCES: Omit<EmailPreferences, "user_id" | "email"> = {
  marketing_consent: false,
  marketing_consent_at: null,
  marketing_consent_source: null,
  marketing_unsubscribed_at: null,
  product_updates: true,
  newsletters: false,
  tips_tutorials: false,
  new_features: true,
};

function serviceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getPreferences(
  userId?: string | null,
): Promise<EmailPreferences | null> {
  assertServerOnly("getPreferences");
  if (!userId) return null;
  try {
    const db = serviceSupabase();
    if (!db) return null;
    const { data } = await db
      .from("verxa_email_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as EmailPreferences | null) ?? null;
  } catch {
    return null;
  }
}

/** Get by email (for logged-out unsubscribe + consent checks). */
export async function getPreferencesByEmail(
  email: string,
): Promise<EmailPreferences | null> {
  assertServerOnly("getPreferencesByEmail");
  try {
    const db = serviceSupabase();
    if (!db) return null;
    const { data } = await db
      .from("verxa_email_preferences")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    return (data as EmailPreferences | null) ?? null;
  } catch {
    return null;
  }
}

export type PreferenceUpdate = Partial<
  Pick<
    EmailPreferences,
    | "marketing_consent"
    | "product_updates"
    | "newsletters"
    | "tips_tutorials"
    | "new_features"
  >
> & { source?: string };

export async function updatePreferences(
  userId: string,
  email: string | null,
  update: PreferenceUpdate,
): Promise<EmailPreferences | null> {
  assertServerOnly("updatePreferences");
  const db = serviceSupabase();
  if (!db) return null;
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (email) patch.email = email.trim().toLowerCase();
  if (update.product_updates !== undefined)
    patch.product_updates = update.product_updates;
  if (update.newsletters !== undefined) patch.newsletters = update.newsletters;
  if (update.tips_tutorials !== undefined)
    patch.tips_tutorials = update.tips_tutorials;
  if (update.new_features !== undefined)
    patch.new_features = update.new_features;
  if (update.marketing_consent !== undefined) {
    patch.marketing_consent = update.marketing_consent;
    if (update.marketing_consent) {
      patch.marketing_consent_at = now;
      patch.marketing_consent_source = update.source ?? "settings";
      patch.marketing_unsubscribed_at = null;
    } else {
      patch.marketing_unsubscribed_at = now;
    }
  }
  try {
    const { data, error } = await db
      .from("verxa_email_preferences")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) return null;
    return data as EmailPreferences;
  } catch {
    return null;
  }
}

/** One-click unsubscribe without login (token already verified by caller). */
export async function unsubscribeEmail(
  email: string,
  userId?: string | null,
): Promise<boolean> {
  assertServerOnly("unsubscribeEmail");
  const db = serviceSupabase();
  if (!db) return false;
  const now = new Date().toISOString();
  try {
    if (userId) {
      const { error } = await db.from("verxa_email_preferences").upsert(
        {
          user_id: userId,
          email: email.trim().toLowerCase(),
          marketing_consent: false,
          marketing_unsubscribed_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );
      return !error;
    }
    // No user id (guest contact) — store under a stable pseudo id.
    const pseudo = `email:${email.trim().toLowerCase()}`;
    const { error } = await db.from("verxa_email_preferences").upsert(
      {
        user_id: pseudo,
        email: email.trim().toLowerCase(),
        marketing_consent: false,
        marketing_unsubscribed_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Marketing gate: explicit opt-in only. Creating an account never implies
 * consent. Checks (in order): user row -> email row -> default false.
 */
export async function canSendMarketing(opts: {
  userId?: string | null;
  email: string;
}): Promise<boolean> {
  assertServerOnly("canSendMarketing");
  try {
    if (opts.userId) {
      const prefs = await getPreferences(opts.userId);
      if (prefs) return prefs.marketing_consent === true;
    }
    const byEmail = await getPreferencesByEmail(opts.email);
    if (byEmail) return byEmail.marketing_consent === true;
    return false;
  } catch {
    return false;
  }
}
