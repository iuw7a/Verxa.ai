import { NextRequest } from "next/server";
import {
  apiJson,
  authenticateApiRequest,
  recordApiUsage,
  requestsToday,
} from "@/lib/api-auth";
import { DEFAULT_MODEL_ID, isKnownModel } from "@/lib/models";

export const runtime = "nodejs";

type IncomingMessage = { role: "user" | "assistant" | "system"; content: string };

function normalizeBaseUrl(raw: string) {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

function approxTokens(text: string) {
  return Math.max(1, Math.round(text.length / 4));
}

/**
 * POST /v1/chat/completions
 * OpenAI-compatible. `stream: true` → SSE; otherwise a single JSON reply.
 * Auth: Authorization: Bearer vx_live_...
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) {
    return apiJson(auth.status, {
      error: { code: auth.code, message: auth.message },
    });
  }
  const { ctx } = auth;

  // Daily rate limit per plan.
  const used = await requestsToday(ctx.keyId);
  if (used >= ctx.limits.requestsPerDay) {
    return apiJson(429, {
      error: {
        code: "rate_limit_exceeded",
        message: `Daily limit of ${ctx.limits.requestsPerDay} requests reached for the ${ctx.plan} plan.`,
      },
    });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return apiJson(500, {
      error: { code: "server_config", message: "Upstream model backend is not configured." },
    });
  }

  let body: {
    model?: string;
    messages?: IncomingMessage[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return apiJson(400, {
      error: { code: "invalid_request", message: "Request body must be JSON." },
    });
  }

  const messages = (body.messages ?? []).filter((m) => m.content?.trim());
  if (!messages.length) {
    return apiJson(400, {
      error: { code: "invalid_request", message: "'messages' must contain at least one message." },
    });
  }

  const model =
    body.model && isKnownModel(body.model) ? body.model : DEFAULT_MODEL_ID;
  const baseUrl = normalizeBaseUrl(
    process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
  );
  const stream = body.stream === true;

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: stream ? "text/event-stream" : "application/json",
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: body.temperature ?? 0.6,
      top_p: 0.9,
      max_tokens: Math.min(body.max_tokens ?? 2048, 4096),
      stream,
    }),
    signal: req.signal,
  });

  if (!upstream.ok || !upstream.body) {
    const detail = (await upstream.text().catch(() => "")).slice(0, 300);
    const status = upstream.status === 401 ? 502 : upstream.status === 404 ? 502 : upstream.status;
    return apiJson(status, {
      error: {
        code: "upstream_error",
        message: `Model backend error (HTTP ${upstream.status}).`,
        detail: detail || undefined,
      },
    });
  }

  void recordApiUsage(
    ctx.keyId,
    messages.reduce((n, m) => n + approxTokens(m.content), 0),
    0,
  );

  // ---- Streaming (SSE passthrough) ----
  if (stream) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    const sse = new ReadableStream({
      async start(controller) {
        let buffer = "";
        let tokensOut = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const data = t.slice(5).trim();
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data) as {
                  choices?: { delta?: { content?: string } }[];
                };
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) tokensOut += approxTokens(delta);
              } catch {
                /* passthrough raw */
              }
              controller.enqueue(encoder.encode(`${line}\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          void recordApiUsage(ctx.keyId, 0, tokensOut);
        } catch {
          controller.close();
        }
      },
    });

    return new Response(sse, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // ---- Non-streaming JSON ----
  const json = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  void recordApiUsage(
    ctx.keyId,
    json.usage?.prompt_tokens ?? 0,
    json.usage?.completion_tokens ?? approxTokens(content),
  );

  return apiJson(200, {
    id: `verxa-${Date.now().toString(36)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: json.usage ?? {
      prompt_tokens: messages.reduce((n, m) => n + approxTokens(m.content), 0),
      completion_tokens: approxTokens(content),
      total_tokens: 0,
    },
  });
}
