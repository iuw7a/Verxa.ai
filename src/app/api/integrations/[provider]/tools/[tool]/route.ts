import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, logIntegrationEvent, resolveAccessToken } from "@/lib/integrations/store";
import { gmailList, gmailRead, gmailSearch } from "@/lib/integrations/tools/gmail";

export const runtime = "nodejs";

type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; code: string; message: string; reconnect?: boolean };

/**
 * POST /api/integrations/:provider/tools/:tool
 * Executes an integration tool server-side for the signed-in user.
 * The access token is resolved inside this handler and never serialized;
 * results are plain data the chat UI can render.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string; tool: string }> },
) {
  const { provider: providerId, tool } = await params;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, code: "unauthenticated", message: "Sign in to use integrations." },
      { status: 401 },
    );
  }

  const resolved = await resolveAccessToken(userId, providerId);
  if (!resolved.ok) {
    return NextResponse.json({
      ok: false,
      code: resolved.reason,
      message: resolved.message,
      reconnect: resolved.reason === "reauth_required" || resolved.reason === "not_connected",
    });
  }
  const accessToken = resolved.accessToken;

  let result: ToolResult;
  try {
    const body = (await req.json().catch(() => ({}))) as { query?: string; id?: string; max?: number };

    switch (`${providerId}:${tool}`) {
      case "google:gmail_list": {
        const r = await gmailList(accessToken, body.max ?? 10);
        result = r.ok ? { ok: true, data: r.emails } : { ok: false, code: r.error.code, message: r.error.message };
        break;
      }
      case "google:gmail_search": {
        const query = (body.query ?? "").trim();
        if (!query) {
          result = { ok: false, code: "bad_request", message: "A search query is required." };
          break;
        }
        const r = await gmailSearch(accessToken, query, body.max ?? 8);
        result = r.ok ? { ok: true, data: r.emails } : { ok: false, code: r.error.code, message: r.error.message };
        break;
      }
      case "google:gmail_read": {
        const id = (body.id ?? "").trim();
        if (!id) {
          result = { ok: false, code: "bad_request", message: "A message id is required." };
          break;
        }
        const r = await gmailRead(accessToken, id);
        result = r.ok ? { ok: true, data: r.email } : { ok: false, code: r.error.code, message: r.error.message };
        break;
      }
      default:
        result = { ok: false, code: "unknown_tool", message: `Tool "${tool}" is not available for ${providerId}.` };
    }
  } catch {
    result = { ok: false, code: "tool_error", message: "The tool failed unexpectedly. Try again." };
  }

  if (!result.ok && (result.code === "forbidden" || result.code === "rate_limited")) {
    await logIntegrationEvent(userId, providerId, "auth_error", `tool ${tool}: ${result.code}`);
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
