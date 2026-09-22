import { NextRequest } from "next/server";
import { CHAT_MODELS } from "@/lib/models";
import { apiJson, authenticateApiRequest } from "@/lib/api-auth";

export const runtime = "nodejs";

/** GET /v1/models — OpenAI-compatible model list for Verxa. */
export async function GET(_req: NextRequest) {
  const auth = await authenticateApiRequest(_req);
  if (!auth.ok) {
    return apiJson(auth.status, {
      error: { code: auth.code, message: auth.message },
    });
  }

  return apiJson(200, {
    object: "list",
    data: CHAT_MODELS.map((m) => ({
      id: m.id,
      object: "model",
      owned_by: "verxa",
      description: m.description,
      badge: m.badge ?? null,
    })),
  });
}
