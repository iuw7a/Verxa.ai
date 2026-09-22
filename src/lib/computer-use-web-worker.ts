/**
 * Web-only Computer Use worker (SERVER-ONLY).
 *
 * Web sessions never wait for a desktop connector: the server itself claims
 * runs as `device_id = "web-session"` and executes web actions directly
 * (real HTTP navigation from the backend, real status/title captured).
 * No install, no download, no desktop app — and nothing is simulated:
 * every event reflects a real backend request.
 */
import { insertRunEvent, type RunRow } from "@/lib/computer-use-runs";
import { createAdminSupabase } from "@/lib/admin";

type Admin = NonNullable<ReturnType<typeof createAdminSupabase>>;

export const WEB_SESSION_DEVICE_ID = "web-session";

/** Short names the worker understands without a full URL. */
const KNOWN_SITES: Record<string, string> = {
  youtube: "https://www.youtube.com",
  google: "https://www.google.com",
};

const DOMAIN_RE =
  /\b((?:[a-z0-9-]+\.)+(?:com|cloud|de|net|org|io|ai|app|dev|eu|info|biz|tv|me|online|site))(?:\/[^\s)>\]]*)?/i;
const URL_RE = /https?:\/\/[^\s)>\]]+/i;

function cleanUrl(raw: string): string {
  return raw.replace(/[.,;:!?)\]]+$/, "");
}

/** Extract the page the user wants opened from a free-text goal. */
export function extractTargetUrl(goal: string): string | null {
  const explicit = goal.match(URL_RE);
  if (explicit) return cleanUrl(explicit[0]);
  const domain = goal.match(DOMAIN_RE);
  if (domain) {
    const host = cleanUrl(domain[0]);
    return /^https?:\/\//i.test(host) ? host : `https://${host}`;
  }
  const lowered = goal.toLowerCase();
  for (const [name, url] of Object.entries(KNOWN_SITES)) {
    if (lowered.includes(name)) return url;
  }
  return null;
}

async function fetchPageInfo(
  url: string,
): Promise<{ ok: boolean; status: number | null; title: string | null }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "Verxa-Web-Session/1.0" },
    });
    let title: string | null = null;
    try {
      const html = await res.text();
      const m = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
      if (m) title = m[1].trim();
    } catch {
      /* body is optional — status alone is still a real result */
    }
    return { ok: res.ok, status: res.status, title };
  } catch {
    return { ok: false, status: null, title: null };
  }
}

/**
 * Advance one web run. Idempotent — safe to call on every client poll:
 * - `queued` + unclaimed → claimed as web session (`running`).
 * - `running` + step 0 → executes one real web action, then terminal.
 * Runs owned by a real desktop device are never touched.
 */
export async function advanceWebRun(
  admin: Admin,
  run: RunRow,
): Promise<RunRow | null> {
  const now = new Date().toISOString();

  // Never touch terminal/paused/confirming runs or desktop-owned runs.
  if (
    run.status === "done" ||
    run.status === "error" ||
    run.status === "stopped" ||
    run.status === "paused" ||
    run.status === "awaiting_confirmation"
  ) {
    return null;
  }
  if (run.device_id && run.device_id !== WEB_SESSION_DEVICE_ID) {
    return null;
  }

  // 1) Claim queued runs as the web session (guarded — exactly one claim wins).
  if (run.status === "queued") {
    const { data: claimed } = await admin
      .from("verxa_computer_runs")
      .update({
        status: "running",
        device_id: WEB_SESSION_DEVICE_ID,
        claimed_at: now,
        updated_at: now,
      })
      .eq("id", run.id)
      .eq("status", "queued")
      .select("id,user_id,device_id,goal,status,step,summary,error")
      .maybeSingle();
    if (!claimed) return null; // lost the race — another worker claimed it
    await insertRunEvent(
      admin,
      run.id,
      "step",
      "Web-Sitzung gestartet — läuft direkt hier, ohne Installation.",
    );
    run = claimed as RunRow;
  }

  // 2) Execute the first real step exactly once.
  if (run.status !== "running" || run.step !== 0) {
    return run;
  }

  const url = extractTargetUrl(run.goal);
  if (!url) {
    await insertRunEvent(
      admin,
      run.id,
      "error",
      "Web-Sitzung kann nur Webseiten öffnen — nenne eine URL oder einen Seitennamen (z. B. „open youtube“).",
      run.goal,
    );
    await admin
      .from("verxa_computer_runs")
      .update({
        status: "error",
        error:
          "Web-Sitzung kann nur Webseiten öffnen — nenne eine URL oder einen Seitennamen.",
        finished_at: now,
        updated_at: now,
      })
      .eq("id", run.id);
    return { ...run, status: "error" };
  }

  await insertRunEvent(admin, run.id, "action", `Seite aufgerufen: ${url}`, url);
  const info = await fetchPageInfo(url);
  const detail = info.title
    ? `HTTP ${info.status ?? "?"} · ${info.title}`
    : info.status !== null
      ? `HTTP ${info.status}`
      : "nicht erreichbar";

  if (info.ok) {
    const summary = `Geöffnet: ${url} (${detail}).`;
    await insertRunEvent(admin, run.id, "observation", detail, url);
    await insertRunEvent(admin, run.id, "done", summary, url);
    await admin
      .from("verxa_computer_runs")
      .update({
        status: "done",
        step: 1,
        summary,
        finished_at: now,
        updated_at: now,
      })
      .eq("id", run.id);
    return { ...run, status: "done", step: 1, summary };
  }

  await insertRunEvent(admin, run.id, "error", `Nicht erreichbar: ${url} (${detail}).`, url);
  await admin
    .from("verxa_computer_runs")
    .update({
      status: "error",
      step: 1,
      error: `Nicht erreichbar: ${url} (${detail}).`,
      finished_at: now,
      updated_at: now,
    })
    .eq("id", run.id);
  return { ...run, status: "error", step: 1 };
}
