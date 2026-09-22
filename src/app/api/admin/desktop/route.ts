import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const day = (d: Date) => d.toISOString().slice(0, 10);
const daysBack = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

/** GET /api/admin/desktop?view=overview|users|user|analytics|discovery|companies|feedback|errors */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;
  const view = req.nextUrl.searchParams.get("view") ?? "overview";
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const os = req.nextUrl.searchParams.get("os") ?? "";
  const version = req.nextUrl.searchParams.get("version") ?? "";
  const days = Math.min(90, Math.max(7, Number(req.nextUrl.searchParams.get("days") ?? 30)));

  try {
    if (view === "overview") {
      const since7 = daysBack(7);
      const since30 = daysBack(30);
      const [sessions, recent, active, ob] = await Promise.all([
        admin.from("verxa_desktop_sessions").select("user_id,os,app_version,first_seen,last_seen,status", { count: "exact" }),
        admin.from("verxa_desktop_sessions").select("user_id").gte("first_seen", since30),
        admin.from("verxa_desktop_sessions").select("user_id").eq("status", "active").gte("last_seen", since7),
        admin.from("verxa_desktop_onboarding").select("user_id,completed_at,first_launch_at", { count: "exact" }),
      ]);
      const rows = (sessions.data ?? []) as { user_id: string; os: string | null; app_version: string | null; first_seen: string; status: string }[];
      const users = new Set(rows.map((r) => r.user_id));
      const newUsers = new Set(
        ((recent.data ?? []) as { user_id: string }[]).map((r) => r.user_id),
      );
      const activeUsers = new Set(
        ((active.data ?? []) as { user_id: string }[]).map((r) => r.user_id),
      );
      const obRows = (ob.data ?? []) as { completed_at: string | null }[];
      const completed = obRows.filter((o) => o.completed_at).length;
      const byOs: Record<string, number> = {};
      const byVersion: Record<string, number> = {};
      for (const r of rows) {
        if (r.status !== "active") continue;
        byOs[r.os ?? "unknown"] = (byOs[r.os ?? "unknown"] ?? 0) + 1;
        byVersion[r.app_version ?? "unknown"] = (byVersion[r.app_version ?? "unknown"] ?? 0) + 1;
      }
      return NextResponse.json({
        totalDesktopUsers: users.size,
        activeDesktopUsers: activeUsers.size,
        newDesktopUsers30d: newUsers.size,
        desktopSessions: sessions.count ?? rows.length,
        onboardingStarted: ob.count ?? obRows.length,
        onboardingCompleted: completed,
        onboardingRate: obRows.length ? Math.round((completed / obRows.length) * 100) : 0,
        byOs,
        byVersion,
      });
    }

    if (view === "users") {
      let query = admin
        .from("verxa_desktop_sessions")
        .select("user_id,device_name,os,app_version,first_seen,last_seen,status")
        .eq("status", "active")
        .order("last_seen", { ascending: false })
        .limit(500);
      if (os) query = query.eq("os", os);
      if (version) query = query.eq("app_version", version);
      const { data: sess } = await query;
      const srows = (sess ?? []) as {
        user_id: string; device_name: string | null; os: string | null;
        app_version: string | null; first_seen: string; last_seen: string; status: string;
      }[];
      const ids = [...new Set(srows.map((r) => r.user_id))];
      const [profiles, obs, authUsers] = await Promise.all([
        admin.from("verxa_profiles").select("id,display_name,email").in("id", ids.length ? ids : ["__none__"]),
        admin
          .from("verxa_desktop_onboarding")
          .select("user_id,company_name,discovery_source,previous_ai,use_cases,completed_at,first_launch_at")
          .in("user_id", ids.length ? ids : ["__none__"]),
        admin.auth.admin.listUsers({ perPage: 500 }),
      ]);
      const emailById = new Map<string, string>();
      for (const u of authUsers.data?.users ?? []) emailById.set(u.id, u.email ?? "");
      const profById = new Map(((profiles.data ?? []) as { id: string; display_name: string | null; email: string | null }[]).map((p) => [p.id, p]));
      const obById = new Map(
        ((obs.data ?? []) as Record<string, unknown>[]).map((o) => [o.user_id as string, o]),
      );
      const firstByUser = new Map<string, { first: string; last: string; os: string | null; version: string | null }>();
      for (const r of srows) {
        const cur = firstByUser.get(r.user_id);
        if (!cur || r.first_seen < cur.first)
          firstByUser.set(r.user_id, { first: r.first_seen, last: r.last_seen, os: r.os, version: r.app_version });
        else if (r.last_seen > cur.last) cur.last = r.last_seen;
      }
      let users = ids.map((id) => {
        const p = profById.get(id);
        const o = obById.get(id) as
          | { company_name?: string; discovery_source?: string; previous_ai?: string; use_cases?: string[]; completed_at?: string; first_launch_at?: string }
          | undefined;
        const f = firstByUser.get(id);
        return {
          user_id: id,
          email: p?.email ?? emailById.get(id) ?? "",
          name: p?.display_name ?? "",
          company: o?.company_name ?? null,
          os: f?.os ?? null,
          version: f?.version ?? null,
          first_login: f?.first ?? null,
          last_active: f?.last ?? null,
          onboarding: o?.completed_at ? "completed" : o ? "started" : "none",
          discovery: o?.discovery_source ?? null,
          previous_ai: o?.previous_ai ?? null,
          use_cases: o?.use_cases ?? [],
        };
      });
      if (q) {
        const needle = q.toLowerCase();
        users = users.filter(
          (u) =>
            u.email.toLowerCase().includes(needle) ||
            (u.name ?? "").toLowerCase().includes(needle) ||
            (u.company ?? "").toLowerCase().includes(needle),
        );
      }
      const dst = req.nextUrl.searchParams.get("discovery") ?? "";
      if (dst) users = users.filter((u) => u.discovery === dst);
      const onb = req.nextUrl.searchParams.get("onboarding") ?? "";
      if (onb) users = users.filter((u) => u.onboarding === onb);
      const comp = req.nextUrl.searchParams.get("company") ?? "";
      if (comp) users = users.filter((u) => (u.company ?? "").toLowerCase().includes(comp.toLowerCase()));
      return NextResponse.json({ users: users.slice(0, 200), total: users.length });
    }

    if (view === "user") {
      const userId = req.nextUrl.searchParams.get("userId") ?? "";
      if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });
      const [sess, ob, events, feedback, authU] = await Promise.all([
        admin.from("verxa_desktop_sessions").select("*").eq("user_id", userId).order("last_seen", { ascending: false }),
        admin.from("verxa_desktop_onboarding").select("*").eq("user_id", userId).maybeSingle(),
        admin.from("verxa_desktop_events").select("event,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
        admin.from("verxa_desktop_feedback").select("rating,category,message,app_version,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        admin.auth.admin.getUserById(userId).catch(() => ({ data: null })),
      ]);
      const usage: Record<string, number> = {};
      for (const e of (events.data ?? []) as { event: string }[]) usage[e.event] = (usage[e.event] ?? 0) + 1;
      const sessions = ((sess.data ?? []) as Record<string, unknown>[]).map((s) => {
        const { token_hash: _t, ...rest } = s;
        void _t;
        return rest;
      });
      return NextResponse.json({
        email: (authU as { data?: { user?: { email?: string } } })?.data?.user?.email ?? null,
        sessions,
        onboarding: ob.data ?? null,
        usage,
        feedback: feedback.data ?? [],
      });
    }

    if (view === "analytics") {
      const since = daysBack(days);
      const { data: events } = await admin
        .from("verxa_desktop_events")
        .select("event,created_at,os")
        .gte("created_at", since)
        .limit(10000);
      const rows = (events ?? []) as { event: string; created_at: string; os: string | null }[];
      const byDay: Record<string, Record<string, number>> = {};
      const byEvent: Record<string, number> = {};
      const byOs: Record<string, number> = {};
      for (const e of rows) {
        const d = day(new Date(e.created_at));
        byDay[d] = byDay[d] ?? {};
        byDay[d][e.event] = (byDay[d][e.event] ?? 0) + 1;
        byEvent[e.event] = (byEvent[e.event] ?? 0) + 1;
        byOs[e.os ?? "unknown"] = (byOs[e.os ?? "unknown"] ?? 0) + 1;
      }
      const { data: sess } = await admin
        .from("verxa_desktop_sessions")
        .select("first_seen,os,app_version")
        .gte("first_seen", since)
        .limit(5000);
      const installsByDay: Record<string, number> = {};
      const versionDist: Record<string, number> = {};
      for (const s of (sess ?? []) as { first_seen: string; app_version: string | null }[]) {
        const d = day(new Date(s.first_seen));
        installsByDay[d] = (installsByDay[d] ?? 0) + 1;
        versionDist[s.app_version ?? "unknown"] = (versionDist[s.app_version ?? "unknown"] ?? 0) + 1;
      }
      const series = Object.keys({ ...byDay, ...installsByDay }).sort();
      return NextResponse.json({
        series,
        byDay,
        byEvent,
        byOs,
        installsByDay,
        versionDist,
        total: rows.length || Object.keys(installsByDay).length ? undefined : "empty",
      });
    }

    if (view === "discovery" || view === "companies") {
      const { data: obs } = await admin
        .from("verxa_desktop_onboarding")
        .select("discovery_source,company_name,use_cases,previous_ai")
        .limit(2000);
      const rows = (obs ?? []) as {
        discovery_source: string | null; company_name: string | null;
        use_cases: string[] | null; previous_ai: string | null;
      }[];
      if (view === "discovery") {
        const sources: Record<string, number> = {};
        const uses: Record<string, number> = {};
        const prev: Record<string, number> = {};
        for (const r of rows) {
          if (r.discovery_source) sources[r.discovery_source] = (sources[r.discovery_source] ?? 0) + 1;
          for (const u of r.use_cases ?? []) uses[u] = (uses[u] ?? 0) + 1;
          if (r.previous_ai) prev[r.previous_ai] = (prev[r.previous_ai] ?? 0) + 1;
        }
        const total = rows.length;
        const pct = (m: Record<string, number>) =>
          Object.entries(m)
            .map(([k, v]) => ({ key: k, count: v, pct: total ? Math.round((v / total) * 100) : 0 }))
            .sort((a, b) => b.count - a.count);
        return NextResponse.json({ total, sources: pct(sources), useCases: pct(uses), previousAi: pct(prev) });
      }
      const companies: Record<string, number> = {};
      for (const r of rows) {
        const c = (r.company_name ?? "").trim();
        if (c) companies[c] = (companies[c] ?? 0) + 1;
      }
      const list = Object.entries(companies)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 200);
      const needle = q.toLowerCase();
      return NextResponse.json({
        companies: needle ? list.filter((c) => c.name.toLowerCase().includes(needle)) : list,
        total: list.length,
      });
    }

    if (view === "feedback") {
      const { data } = await admin
        .from("verxa_desktop_feedback")
        .select("id,user_id,rating,category,message,app_version,os,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const rows = (data ?? []) as Record<string, unknown>[];
      const counts: Record<string, number> = {};
      for (const r of rows) {
        const k = `${r.category}:${r.rating ?? "none"}`;
        counts[k] = (counts[k] ?? 0) + 1;
      }
      return NextResponse.json({ feedback: rows, counts });
    }

    if (view === "errors") {
      const { data } = await admin
        .from("verxa_desktop_events")
        .select("created_at,os,app_version,detail")
        .eq("event", "error")
        .gte("created_at", daysBack(days))
        .order("created_at", { ascending: false })
        .limit(500);
      const rows = (data ?? []) as { created_at: string; os: string | null; app_version: string | null; detail: { kind?: string; message?: string } }[];
      const byKind: Record<string, number> = {};
      for (const r of rows) {
        const k = r.detail?.kind ?? "unknown";
        byKind[k] = (byKind[k] ?? 0) + 1;
      }
      return NextResponse.json({ errors: rows, byKind, total: rows.length });
    }

    return NextResponse.json({ error: "Unknown view." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Desktop query failed." },
      { status: 500 },
    );
  }
}
