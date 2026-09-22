import { supabase } from "./supabase";
import { API_BASE } from "./config";

/** Fresh access token for API calls (mobile auth = Bearer header). */
async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiHeaders(json = true): Promise<Record<string, string>> {
  const token = await accessToken();
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "unknown", status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** JSON request helper with auth + clean errors. */
export async function api<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: await apiHeaders(),
    body: init?.body != null ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const j = (json ?? {}) as { error?: string; message?: string; code?: string };
    throw new ApiError(j.error ?? j.message ?? `Request failed (${res.status})`, j.code, res.status);
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// Chat streaming (SSE via fetch — works in React Native)
// ---------------------------------------------------------------------------

export type ChatEvent =
  | { type: "status"; value: string }
  | { type: "delta"; text: string }
  | { type: "sources"; sources: { title: string; url: string }[] }
  | { type: "media"; kind: "image" | "video"; state: string; url?: string; prompt?: string; error?: string; agnesVideoId?: string; videoModel?: string }
  | { type: "error"; message: string }
  | { type: "done" };

export async function streamChat(
  body: {
    messages: { role: string; content: string }[];
    mediaMode?: "image" | "video" | null;
    enableSearch?: boolean;
  },
  onEvent: (e: ChatEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: await apiHeaders(),
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch { /* ignore */ }
    throw new ApiError(message, "http", res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as ChatEvent);
      } catch {
        /* skip malformed frame */
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Generation (Studio parity on mobile)
// ---------------------------------------------------------------------------

export async function generateImage(prompt: string): Promise<string> {
  const j = await api<{ url?: string; message?: string }>("/api/generate/image", {
    method: "POST",
    body: { prompt },
  });
  if (!j.url) throw new ApiError(j.message ?? "Image generation failed.");
  return j.url;
}

export async function submitVideo(prompt: string): Promise<{ videoId: string; model?: string }> {
  const j = await api<{ videoId?: string; model?: string; message?: string }>("/api/generate/video", {
    method: "POST",
    body: { prompt },
  });
  if (!j.videoId) throw new ApiError(j.message ?? "Video submission failed.");
  return { videoId: j.videoId, model: j.model };
}

export async function videoStatus(
  videoId: string,
  model?: string,
): Promise<{ state: "running" | "done" | "error"; url?: string; message?: string }> {
  return api(`/api/generate/video?videoId=${encodeURIComponent(videoId)}${model ? `&model=${encodeURIComponent(model)}` : ""}`);
}

// ---------------------------------------------------------------------------
// Studio library
// ---------------------------------------------------------------------------

export type LibraryItem = {
  id: string;
  kind: "image" | "video";
  mode: string;
  prompt: string;
  url: string;
  createdAt: number;
};

export async function fetchLibrary(): Promise<LibraryItem[]> {
  const j = await api<{ items?: LibraryItem[] }>("/api/studio");
  return j.items ?? [];
}

export async function saveToLibrary(input: {
  kind: "image" | "video";
  mode?: string;
  prompt?: string;
  url?: string;
}): Promise<LibraryItem> {
  const j = await api<{ item: LibraryItem }>("/api/studio", { method: "POST", body: input });
  return j.item;
}

export async function deleteLibraryItem(id: string): Promise<void> {
  await api("/api/studio/delete", { method: "DELETE", body: { id } });
}

// ---------------------------------------------------------------------------
// Integrations / plugins (real backend catalog + status)
// ---------------------------------------------------------------------------

export type PluginInfo = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  authType: string;
  permissions: string[];
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  status: string | null;
  accountLabel: string | null;
};

export async function fetchPlugins(): Promise<PluginInfo[]> {
  const j = await api<{
    integrations?: Array<{
      id: string;
      name: string;
      tagline: string;
      description: string;
      category: string;
      authType: string;
      permissions: string[];
      enabled: boolean;
      configured: boolean;
      connection: { status: string; accountLabel: string | null } | null;
    }>;
  }>("/api/integrations");
  return (j.integrations ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    tagline: d.tagline,
    description: d.description,
    category: d.category,
    authType: d.authType,
    permissions: d.permissions,
    enabled: d.enabled,
    configured: d.configured,
    connected: d.connection?.status === "active",
    status: d.connection?.status ?? null,
    accountLabel: d.connection?.accountLabel ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export type Profile = {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  avatarUrl: string;
};

export async function fetchProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  try {
    const rows = await supabase
      .from("verxa_profiles")
      .select("display_name,username,email,bio,avatar_url")
      .eq("id", data.user.id)
      .single();
    const p = (rows.data ?? {}) as Record<string, string | null>;
    return {
      displayName: p.display_name ?? "",
      username: p.username ?? "",
      email: p.email ?? data.user.email ?? "",
      bio: p.bio ?? "",
      avatarUrl: p.avatar_url ?? "",
    };
  } catch {
    return {
      displayName: "",
      username: "",
      email: data.user.email ?? "",
      bio: "",
      avatarUrl: "",
    };
  }
}

/** Absolute URL for a backend-served media path. */
export function mediaUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
}
