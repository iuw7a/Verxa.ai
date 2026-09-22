import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendEmail, renderEmail, type EmailTemplate } from "@/lib/email";
import { sendTemplateEmail } from "@/lib/email/service";
import {
  getTemplate,
  renderTemplate,
  templateMetadata,
  templateStats,
} from "@/lib/email/registry";
import { eventMetadata } from "@/lib/email/events";
import { emailConfigStatus } from "@/lib/email/config";

export const runtime = "nodejs";

const VALID_TEMPLATES: EmailTemplate[] = [
  "welcome",
  "verify",
  "password_reset",
  "password_changed",
  "email_changed",
  "profile_updated",
  "new_login",
  "subscription_started",
  "subscription_canceled",
  "subscription_renewed",
  "payment_failed",
  "ticket_created",
  "ticket_replied",
  "ceo_custom",
];

/** GET /api/admin/emails — recent email logs (default) or ?view=.... */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const view = req.nextUrl.searchParams.get("view");
  if (view === "templates") {
    return NextResponse.json({ templates: templateMetadata(), stats: templateStats() });
  }
  if (view === "events") {
    return NextResponse.json({ events: eventMetadata() });
  }
  if (view === "config") {
    return NextResponse.json({ config: emailConfigStatus() });
  }
  if (view === "stats") {
    const [logs, prefs] = await Promise.all([
      admin.from("verxa_email_logs").select("status,template,kind").limit(2000),
      admin
        .from("verxa_email_preferences")
        .select("marketing_consent", { count: "exact" }),
    ]);
    const byStatus: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    for (const l of (logs.data ?? []) as { status?: string; kind?: string }[]) {
      const s = l.status ?? "unknown";
      byStatus[s] = (byStatus[s] ?? 0) + 1;
      const k = l.kind ?? "unknown";
      byKind[k] = (byKind[k] ?? 0) + 1;
    }
    const optedIn =
      ((prefs.data ?? []) as { marketing_consent?: boolean }[]).filter(
        (p) => p.marketing_consent,
      ).length ?? 0;
    return NextResponse.json({
      byStatus,
      byKind,
      marketingOptedIn: optedIn,
      preferencesRows: prefs.count ?? (prefs.data ?? []).length,
      logsError: logs.error?.message ?? null,
      prefsError: null,
    });
  }

  const template = req.nextUrl.searchParams.get("template");
  let query = admin
    .from("verxa_email_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (template) query = query.eq("template", template);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}

/** POST /api/admin/emails — send a template or custom email. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const body = (await req.json().catch(() => null)) as {
    to?: string;
    template?: string;
    name?: string;
    subject?: string;
    message?: string;
    fromOverride?: string;
  } | null;

  if (!body?.to || !body.template) {
    return NextResponse.json(
      { error: "to and a valid template are required" },
      { status: 400 },
    );
  }

  // New template library (Resend-first, consent-gated for marketing).
  const modern = getTemplate(body.template);
  if (modern) {
    const result = await sendTemplateEmail({
      templateId: modern.id,
      to: body.to,
      event: "ADMIN_SEND",
      vars: {
        name: body.name,
        subject: body.subject,
        message: body.message,
        featureName: body.subject,
      },
    });
    await admin.from("verxa_activity").insert({
      actor: "admin",
      action: result.ok ? "email.sent" : "email.failed",
      detail: { template: modern.id, to: body.to },
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  if (!VALID_TEMPLATES.includes(body.template as EmailTemplate)) {
    return NextResponse.json({ error: "unknown template" }, { status: 400 });
  }

  const result = await sendEmail({
    template: body.template as EmailTemplate,
    to: body.to,
    vars: {
      name: body.name,
      subject: body.subject,
      message: body.message,
    },
    fromOverride: body.fromOverride,
  });

  await admin.from("verxa_activity").insert({
    actor: "admin",
    action: result.ok ? "email.sent" : "email.failed",
    detail: { template: body.template, to: body.to },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

/** PUT /api/admin/emails — resend a previously logged email. */
export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const body = (await req.json().catch(() => null)) as { logId?: string } | null;
  if (!body?.logId) {
    return NextResponse.json({ error: "logId required" }, { status: 400 });
  }

  const { data: log } = await admin
    .from("verxa_email_logs")
    .select("to_email,from_email,template,subject,payload")
    .eq("id", body.logId)
    .maybeSingle();

  if (!log) {
    return NextResponse.json({ error: "Log entry not found" }, { status: 404 });
  }

  const result = await sendEmail({
    template: log.template as EmailTemplate,
    to: log.to_email,
    fromOverride: log.from_email,
    vars: (log.payload ?? {}) as Record<string, never>,
  });

  await admin.from("verxa_activity").insert({
    actor: "admin",
    action: "email.resent",
    detail: { logId: body.logId, ok: result.ok },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

/** Convenience: preview any template's rendered HTML. ?template=welcome */
export async function OPTIONS(req: NextRequest) {
  const template = req.nextUrl.searchParams.get("template");
  if (!template) {
    return NextResponse.json({ error: "invalid template" }, { status: 400 });
  }
  const modern = getTemplate(template);
  if (modern) {
    const rendered = renderTemplate(
      modern,
      { name: "Alex", email: "alex@example.com" },
      "en",
    );
    return NextResponse.json({ subject: rendered.subject, html: rendered.html });
  }
  if (!(VALID_TEMPLATES as string[]).includes(template)) {
    return NextResponse.json({ error: "invalid template" }, { status: 400 });
  }
  const { subject, html } = renderEmail(template as EmailTemplate, { name: "Alex" });
  return NextResponse.json({ subject, html });
}
