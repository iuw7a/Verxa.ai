"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { readJson, writeJson } from "@/lib/storage";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const emptyProfile: Profile = {
  displayName: "",
  username: "",
  email: "",
  emailVerified: false,
  bio: "",
  location: "",
  avatarUrl: "",
};

type AuthContextValue = {
  user: User | null;
  profile: Profile;
  loading: boolean;
  authOpen: boolean;
  pendingMessage: string | null;
  setAuthOpen: (open: boolean) => void;
  requireAuth: (opts?: { pendingMessage?: string }) => void;
  consumePendingMessage: () => string | null;
  saveProfile: (next: Profile) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  useEffect(() => {
    setProfile(readJson("profile", emptyProfile));
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        const u = data.user;
        const meta = u.user_metadata ?? {};
        const fallbackName =
          (meta.full_name as string) || u.email?.split("@")[0] || "";

        // Load the profile row created by the DB trigger (guest edits win if newer).
        let row: Record<string, unknown> | null = null;
        try {
          const res = await supabase
            .from("verxa_profiles")
            .select("display_name,username,email,bio,location,avatar_url")
            .eq("id", u.id)
            .maybeSingle();
          row = (res.data as Record<string, unknown> | null) ?? null;
        } catch {
          /* profile row stays null; fall back to metadata */
        }

        setProfile((prev) => {
          const next: Profile = {
            displayName:
              (row?.display_name as string) || prev.displayName || fallbackName,
            username: (row?.username as string) || prev.username,
            email: u.email ?? (row?.email as string) ?? prev.email,
            emailVerified: Boolean(u.email_confirmed_at),
            bio: (row?.bio as string) || prev.bio,
            location: (row?.location as string) || prev.location,
            avatarUrl: (row?.avatar_url as string) || prev.avatarUrl,
          };
          writeJson("profile", next);
          return next;
        });
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setAuthOpen(false);
      // Welcome + verification emails on fresh signups (SIGNED_UP is not in older typings).
      if (
        (event as string) === "SIGNED_UP" &&
        session?.user?.email
      ) {
        const payload = JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
          name:
            (session.user.user_metadata?.full_name as string | undefined) ??
            undefined,
        });
        void fetch("/api/email/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        }).catch(() => {});
        // Resend verification email (custom token flow, supplements Supabase).
        void fetch("/api/email/verify/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: session.user.email }),
        }).catch(() => {});
      }
      // New-device login notice (server dedupes by device, 30-day cooldown).
      if ((event as string) === "SIGNED_IN" && session?.user?.email) {
        void fetch("/api/email/events/login", { method: "POST" }).catch(
          () => {},
        );
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const saveProfile = useCallback((next: Profile) => {
    setProfile(next);
    writeJson("profile", next);
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) return;
        return supabase.from("verxa_profiles").upsert(
          {
            id: data.user.id,
            email: next.email,
            display_name: next.displayName,
            username: next.username || null,
            bio: next.bio,
            location: next.location,
            avatar_url: next.avatarUrl,
          },
          { onConflict: "id" },
        );
      })
      .catch((error) => console.warn("[profile] cloud save failed:", error));
  }, []);

  const requireAuth = useCallback((opts?: { pendingMessage?: string }) => {
    if (opts?.pendingMessage) setPendingMessage(opts.pendingMessage);
    setAuthOpen(true);
  }, []);

  const consumePendingMessage = useCallback(() => {
    const next = pendingMessage;
    setPendingMessage(null);
    return next;
  }, [pendingMessage]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    if (!supabase) return "Supabase is not configured.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const supabase = createClient();
      if (!supabase) return "Supabase is not configured.";
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (!error) {
        saveProfile({
          ...readJson("profile", emptyProfile),
          displayName: name,
          email,
        });
      }
      return error?.message ?? null;
    },
    [saveProfile],
  );

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase?.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      authOpen,
      pendingMessage,
      setAuthOpen,
      requireAuth,
      consumePendingMessage,
      saveProfile,
      signIn,
      signUp,
      signOut,
    }),
    [
      user,
      profile,
      loading,
      authOpen,
      pendingMessage,
      requireAuth,
      consumePendingMessage,
      saveProfile,
      signIn,
      signUp,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
