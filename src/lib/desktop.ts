/**
 * Verxa Desktop backend helpers (SERVER-ONLY).
 * Device auth, desktop session tokens, user resolution (desktop token OR
 * Supabase session), analytics allowlist. The desktop client is untrusted:
 * every route re-verifies authentication and scopes all DB access by user.
 */
import { createHash, randomBytes } from "crypto";
import { createAdminSupabase } from "@/lib/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const DESKTOP_TOKEN_PREFIX = "vdsk_";
export const DESKTOP_AUTH_TTL_MS = 10 * 60 * 1000;
export const DESKTOP_SESSION_TTL_MS = 365 * 24 * 3600 * 1000;

export type DesktopSession = {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  os: string | null;
  app_version: string | null;
  status: string;
};

const UNAMBIGUOUS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Short user code shown on BOTH desktop and browser (anti-phishing check). */
export function newUserCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += UNAMBIGUOUS[bytes[i] % UNAMBIGUOUS.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function newSessionToken(): { token: string; hash: string } {
  const token = `${DESKTOP_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return { token, hash: sha256Hex(token) };
}

export function newSecretId(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export type DesktopAuthContext = {
  userId: string;
  email: string | null;
  via: "desktop" | "session";
  session?: DesktopSession;
};

/**
 * Resolve the calling user from a desktop session token
 * (`Authorization: Bearer vdsk_…`) or a Supabase session (browser).
 * Touches last_seen for desktop sessions (fire-and-forget).
 */
export async function resolveDesktopUser(
  req: Request,
): Promise<DesktopAuthContext | null> {
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (bearer.startsWith(DESKTOP_TOKEN_PREFIX)) {
    const admin = createAdminSupabase();
    if (!admin) return null;
    const { data } = await admin
      .from("verxa_desktop_sessions")
      .select("id,user_id,device_id,device_name,os,app_version,status")
      .eq("token_hash", sha256Hex(bearer))
      .eq("status", "active")
      .maybeSingle();
    if (!data) return null;
    const row = data as DesktopSession & { user_id: string };
    void (async () => {
      try {
        await admin
          .from("verxa_desktop_sessions")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", row.id);
      } catch {
        /* best effort */
      }
    })();
    return { userId: row.user_id, email: null, via: "desktop", session: row };
  }

  // Browser session (cookies) or Supabase JWT (mobile-style header).
  const supabase = await createServerSupabase();
  const { data } = supabase
    ? await supabase.auth.getUser()
    : { data: null };
  if (!data?.user) return null;
  return { userId: data.user.id, email: data.user.email ?? null, via: "session" };
}

/** Privacy-safe analytics events the desktop client may report. */
export const DESKTOP_EVENT_ALLOWLIST = new Set([
  "app_open",
  "app_close",
  "chat_create",
  "chat_open",
  "chat_send",
  "quickchat_open",
  "quickchat_send",
  "quickchat_expand",
  "shortcut_used",
  "command_used",
  "tray_action",
  "notification_shown",
  "notification_clicked",
  "update_check",
  "update_downloaded",
  "update_installed",
  "onboarding_step",
  "onboarding_complete",
  "onboarding_skip",
  "settings_change",
  "sign_out",
  "sync_run",
  "search_used",
  "model_change",
  "computer_use_enabled",
  "computer_use_disabled",
  "computer_use_started",
  "computer_use_completed",
  "computer_use_failed",
  "computer_use_stopped",
  "computer_use_confirmation",
  "error",
]);

/** Small, safe detail object — strips anything that looks like a secret. */
export function sanitizeDetail(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (/token|secret|password|key|auth|cookie|credential/i.test(k)) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k.slice(0, 40)] = typeof v === "string" ? v.slice(0, 200) : v;
    }
    if (Object.keys(out).length >= 12) break;
  }
  return out;
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
  return ip ? ip.slice(0, 64) : null;
}
