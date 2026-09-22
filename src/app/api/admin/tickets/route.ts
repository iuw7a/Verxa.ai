import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { emitEmailEvent } from "@/lib/email/events";

export const runtime = "nodejs";

/** GET /api/admin/tickets — all tickets with replies. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const [tickets, replies] = await Promise.all([
    admin
      .from("verxa_tickets")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200),
    admin.from("verxa_ticket_replies").select("*").order("created_at", { ascending: true }),
  ]);

  const byTicket = new Map<string, typeof replies.data>();
  for (const r of replies.data ?? []) {
    const list = byTicket.get(r.ticket_id) ?? [];
    list.push(r);
    byTicket.set(r.ticket_id, list);
  }

  const result = (tickets.data ?? []).map((t) => ({
    ...t,
    replies: byTicket.get(t.id) ?? [],
  }));

  return NextResponse.json({ tickets: result });
}

/** POST /api/admin/tickets — reply + optional status/priority change. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const body = (await req.json().catch(() => null)) as {
    ticketId?: string;
    reply?: string;
    status?: string;
    priority?: string;
    notifyUser?: boolean;
  } | null;

  if (!body?.ticketId) {
    return NextResponse.json({ error: "ticketId required" }, { status: 400 });
  }

  const { data: ticket } = await admin
    .from("verxa_tickets")
    .select("*")
    .eq("id", body.ticketId)
    .maybeSingle();
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) patch.status = body.status;
  if (body.priority) patch.priority = body.priority;
  await admin.from("verxa_tickets").update(patch).eq("id", body.ticketId);

  if (body.reply) {
    await admin.from("verxa_ticket_replies").insert({
      ticket_id: body.ticketId,
      author: "admin",
      body: body.reply,
    });

    if (body.notifyUser !== false) {
      void emitEmailEvent(
        body.status === "closed" && !body.reply
          ? "SUPPORT_TICKET_CLOSED"
          : "SUPPORT_TICKET_REPLY",
        {
          to: ticket.email,
          userId: ticket.user_id ?? null,
          vars: {
            name: ticket.email.split("@")[0],
            email: ticket.email,
            subject: ticket.subject ?? "your request",
            message: body.reply,
            note: ticket.subject ?? "",
          },
        },
      );
    }
  } else if (body.status === "closed" && body.notifyUser !== false) {
    void emitEmailEvent("SUPPORT_TICKET_CLOSED", {
      to: ticket.email,
      userId: ticket.user_id ?? null,
      vars: {
        name: ticket.email.split("@")[0],
        email: ticket.email,
        note: ticket.subject ?? "",
      },
    });
  }

  await admin.from("verxa_activity").insert({
    actor: "admin",
    action: "ticket.updated",
    detail: { ticketId: body.ticketId, status: body.status },
  });

  return NextResponse.json({ ok: true });
}
