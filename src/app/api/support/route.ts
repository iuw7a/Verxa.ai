import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/admin";
import { emitEmailEvent } from "@/lib/email/events";
import { sendTransactional } from "@/lib/email/service";
import { senderEmail } from "@/lib/email/config";

export const runtime = "nodejs";

/** POST /api/support — create a ticket from the support form. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    subject?: string;
    message?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const email = body?.email?.trim();
  const message = body?.message?.trim();
  if (!email || !message) {
    return NextResponse.json(
      { error: "email and message are required" },
      { status: 400 },
    );
  }

  const serverSupabase = await createServerSupabase();
  const { data: userData } = serverSupabase
    ? await serverSupabase.auth.getUser()
    : { data: null };

  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json(
      { error: "Storage not configured." },
      { status: 500 },
    );
  }

  const { data: ticket, error } = await admin
    .from("verxa_tickets")
    .insert({
      user_id: userData?.user?.id ?? null,
      email,
      subject: body.subject?.trim() || "Support request",
      message,
      status: "open",
      priority: "normal",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const subject = body.subject?.trim() || "Support request";
  void emitEmailEvent("SUPPORT_TICKET_CREATED", {
    to: email,
    userId: userData?.user?.id ?? null,
    vars: {
      name: email.split("@")[0],
      email,
      subject,
      message,
    },
  });
  // Internal staff notice (never sent to the user).
  void sendTransactional({
    templateId: "support-internal-new-ticket",
    to: senderEmail("support"),
    event: "SUPPORT_TICKET_CREATED",
    vars: { email, subject, message },
  });

  await admin.from("verxa_activity").insert({
    actor: userData?.user?.email ?? email,
    action: "ticket.created",
    detail: { ticketId: ticket?.id },
  });

  return NextResponse.json({ ok: true, ticketId: ticket?.id });
}
