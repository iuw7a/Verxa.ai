/**
 * Shared server helpers for web-driven Computer Use runs (SERVER-ONLY).
 * The website creates runs; a paired device claims them and executes via
 * the existing /api/desktop/computer-use/step reasoning endpoint.
 */
import { createAdminSupabase } from "@/lib/admin";

type Admin = NonNullable<ReturnType<typeof createAdminSupabase>>;

export type RunStatus =
  | "queued"
  | "running"
  | "awaiting_confirmation"
  | "paused"
  | "stopped"
  | "done"
  | "error";

export const TERMINAL_RUN_STATUSES: ReadonlySet<string> = new Set([
  "stopped",
  "done",
  "error",
]);

export const RUN_EVENT_KINDS: ReadonlySet<string> = new Set([
  "step",
  "action",
  "observation",
  "confirmation",
  "done",
  "error",
  "stopped",
  "paused",
  "resumed",
  "info",
]);

export type RunRow = {
  id: string;
  user_id: string;
  device_id: string | null;
  goal: string;
  status: RunStatus;
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

/** Columns that are safe to ship to the console on every poll (no frame). */
export const RUN_COLUMNS =
  "id,user_id,device_id,goal,status,step,summary,error,created_at,updated_at,claimed_at,finished_at,frame_requested_at,last_frame_at";

/** Load a run that belongs to the caller (never leaks other users' runs). */
export async function loadOwnedRun(
  admin: Admin,
  userId: string,
  runId: string,
): Promise<RunRow | null> {
  const { data } = await admin
    .from("verxa_computer_runs")
    .select(RUN_COLUMNS)
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as RunRow | null) ?? null;
}

/** Server-side consent gate — mirrors what the step route enforces. */
export async function loadConsentEnabled(
  admin: Admin,
  userId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("verxa_desktop_computer_use")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { enabled?: boolean } | null)?.enabled === true;
}

/** Append one activity event (best-effort callers may ignore failures). */
export async function insertRunEvent(
  admin: Admin,
  runId: string,
  kind: string,
  label: string,
  detail?: string | null,
  payload?: unknown,
): Promise<void> {
  await admin.from("verxa_computer_run_events").insert({
    run_id: runId,
    kind,
    label: label.slice(0, 500),
    detail: detail ? detail.slice(0, 1000) : null,
    payload: payload ?? null,
  });
}
