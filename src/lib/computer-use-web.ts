/**
 * Computer Use web client — types + fetch helpers for the console.
 * All authorization state comes from the server (consent record + device
 * sessions); this file never invents a status.
 */

export type CuRunStatus =
  | "queued"
  | "running"
  | "awaiting_confirmation"
  | "paused"
  | "stopped"
  | "done"
  | "error";

export type CuRun = {
  id: string;
  device_id: string | null;
  goal: string;
  status: CuRunStatus;
  step: number;
  summary: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  finished_at: string | null;
  frame_requested_at?: string | null;
  last_frame_at?: string | null;
};

export type CuEvent = {
  id: number;
  kind: string;
  label: string;
  detail: string | null;
  created_at: string;
};

export type CuConfirmation = {
  id: string;
  action: unknown;
  reason: string;
  status: "pending" | "approved" | "denied" | "expired";
  created_at: string;
  decided_at: string | null;
};

export type CuConsent = {
  enabled: boolean;
  safe_mode: boolean;
  screen_access: boolean;
  mouse_control: boolean;
  keyboard_control: boolean;
  app_control: boolean;
  allowed_displays: string;
  granted_at?: string | null;
  revoked_at?: string | null;
};

export type CuDevice = {
  device_id: string;
  device_name: string | null;
  os: string | null;
  app_version: string | null;
  ip: string | null;
  status: string;
  first_seen: string;
  last_seen: string;
  revoked_at: string | null;
  current?: boolean;
};

export function isTerminal(status: CuRunStatus): boolean {
  return status === "done" || status === "error" || status === "stopped";
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} d ago`;
}

/** Human-readable one-liner for a pending confirmation action. */
export function humanizeAction(action: unknown): string {
  if (!action || typeof action !== "object") return "An action";
  const a = action as Record<string, unknown>;
  const t = typeof a.type === "string" ? a.type : "action";
  const cut = (v: unknown, n = 60) => {
    const s = typeof v === "string" ? v : "";
    return s.length > n ? `${s.slice(0, n)}…` : s;
  };
  switch (t) {
    case "click":
      return `Click at (${a.x}, ${a.y})`;
    case "double_click":
      return `Double-click at (${a.x}, ${a.y})`;
    case "right_click":
      return `Right-click at (${a.x}, ${a.y})`;
    case "move_mouse":
      return `Move the mouse to (${a.x}, ${a.y})`;
    case "drag":
      return `Drag from (${a.x1}, ${a.y1}) to (${a.x2}, ${a.y2})`;
    case "scroll":
      return `Scroll the screen`;
    case "type":
      return `Type “${cut(a.text)}”`;
    case "key_press":
      return `Press ${cut(a.key, 20)}`;
    case "hotkey":
      return Array.isArray(a.keys)
        ? `Press ${(a.keys as string[]).join(" + ")}`
        : "Press a key combination";
    case "open_application":
      return `Open ${cut(a.app, 40)}`;
    case "focus_window":
      return `Focus the window “${cut(a.title)}”`;
    case "close_window":
      return `Close the window “${cut(a.title)}”`;
    default:
      return t.replace(/_/g, " ");
  }
}

type FetchResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function jsonFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return { ok: false, error: json?.error ?? `Request failed (${res.status}).` };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "Could not reach Verxa. Check your connection." };
  }
}

export function getConsent() {
  return jsonFetch<{ consent: CuConsent }>("/api/desktop/computer-use/consent");
}

export function saveConsent(patch: Partial<CuConsent> & { enabled: boolean }) {
  return jsonFetch<{ ok: boolean; consent: CuConsent }>(
    "/api/desktop/computer-use/consent",
    { method: "POST", body: JSON.stringify(patch) },
  );
}

export function getDevices() {
  return jsonFetch<{ devices: CuDevice[] }>("/api/desktop/devices");
}

export function revokeDevice(deviceId: string) {
  return jsonFetch<{ ok: boolean }>("/api/desktop/devices/revoke", {
    method: "POST",
    body: JSON.stringify({ device_id: deviceId }),
  });
}

export function revokeAllDevices() {
  return jsonFetch<{ ok: boolean }>("/api/desktop/devices/revoke", {
    method: "POST",
    body: JSON.stringify({ all: true }),
  });
}

export function listRuns() {
  return jsonFetch<{ runs: CuRun[] }>("/api/desktop/computer-use/runs");
}

export function createRun(goal: string) {
  return jsonFetch<{ run: CuRun }>("/api/desktop/computer-use/runs", {
    method: "POST",
    body: JSON.stringify({ goal }),
  });
}

export function getRun(id: string) {
  return jsonFetch<{
    run: CuRun;
    events: CuEvent[];
    confirmation: CuConfirmation | null;
  }>(`/api/desktop/computer-use/runs/${encodeURIComponent(id)}`);
}

export function controlRun(
  id: string,
  action: "stop" | "pause" | "resume" | "capture",
) {
  return jsonFetch<{ ok: boolean; status: CuRunStatus }>(
    `/api/desktop/computer-use/runs/${encodeURIComponent(id)}/control`,
    { method: "POST", body: JSON.stringify({ action }) },
  );
}

/** Latest screen preview ("View Screen") — only fetched by the preview modal. */
export function getFrame(id: string) {
  return jsonFetch<{ frame: string | null; at: string | null; pending: boolean }>(
    `/api/desktop/computer-use/runs/${encodeURIComponent(id)}/frame`,
  );
}

export function decideConfirmation(
  runId: string,
  confirmationId: string,
  allow: boolean,
) {
  return jsonFetch<{ ok: boolean; allow: boolean }>(
    `/api/desktop/computer-use/runs/${encodeURIComponent(runId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ confirmation_id: confirmationId, allow }),
    },
  );
}
