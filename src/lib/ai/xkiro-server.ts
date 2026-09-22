/**
 * Verxa AI — server-side XKiro client (OpenAI-compatible chat completions).
 * Used by all /api/ai/* routes so every module shares one gateway, one
 * model selection, and one streaming implementation.
 */

import { aiModelFallbacks, xkiroApiKey, xkiroBaseUrl } from "./config";

export type AiTextMessage = { role: "user" | "assistant"; content: string };

export type AiImagePart = {
  type: "image_url";
  image_url: { url: string };
};

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ({ type: "text"; text: string } | AiImagePart)[];
};

export function textMessages(
  system: string,
  history: AiTextMessage[],
): AiChatMessage[] {
  return [
    { role: "system", content: system },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];
}

/** A data-URL (data:image/...;base64,...) must stay intact end-to-end. */
export function isImageDataUrl(s: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s);
}

async function postChat(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Response> {
  const key = xkiroApiKey();
  if (!key) {
    throw new Error("XKIRO_API_KEY is not configured on the server.");
  }
  const res = await fetch(`${xkiroBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
  });
  return res;
}

async function failureDetail(res: Response): Promise<string> {
  const text = (await res.text().catch(() => ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return `HTTP ${res.status}${text ? `: ${text}` : ""}`;
}

export type StreamCallbacks = {
  onDelta: (text: string) => void;
  signal?: AbortSignal;
};

/**
 * Streams a completion, trying the primary model then free-tier fallbacks.
 * Returns the model id that served the request.
 */
export async function streamAiCompletion(
  messages: AiChatMessage[],
  cb: StreamCallbacks,
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const attempts: string[] = [];
  for (const model of aiModelFallbacks()) {
    let res: Response;
    try {
      res = await postChat(
        {
          model,
          messages,
          temperature: opts?.temperature ?? 0.6,
          top_p: 0.9,
          max_tokens: opts?.maxTokens ?? 4096,
          stream: true,
        },
        cb.signal,
      );
    } catch (err) {
      attempts.push(`${model} → fetch threw ${(err as Error).message}`);
      continue;
    }
    if (!res.ok || !res.body) {
      attempts.push(`${model} → ${await failureDetail(res)}`);
      continue;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sawContent = false;
    try {
      for (;;) {
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
            if (delta) {
              sawContent = true;
              cb.onDelta(delta);
            }
          } catch {
            /* skip malformed chunk */
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    if (sawContent) return model;
    attempts.push(`${model} → streamed zero content`);
  }
  throw new Error(`AI request failed (${attempts.join(" | ")})`);
}

/** Non-streaming completion (image analysis, titles, fallbacks). */
export async function completeAi(
  messages: AiChatMessage[],
  opts?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
): Promise<{ text: string; model: string }> {
  const key = xkiroApiKey();
  if (!key) throw new Error("XKIRO_API_KEY is not configured on the server.");
  const errors: string[] = [];
  for (const model of aiModelFallbacks()) {
    let res: Response;
    try {
      res = await fetch(`${xkiroBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts?.temperature ?? 0.5,
          max_tokens: opts?.maxTokens ?? 2048,
          stream: false,
        }),
        signal: opts?.signal,
      });
    } catch (err) {
      errors.push(`${model} → fetch threw ${(err as Error).message}`);
      continue;
    }
    if (!res.ok) {
      errors.push(`${model} → ${await failureDetail(res)}`);
      continue;
    }
    const json = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
    } | null;
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text === "string" && text.trim()) {
      return { text: text.trim(), model };
    }
    errors.push(`${model} → empty content`);
  }
  throw new Error(`AI request failed (${errors.join(" | ")})`);
}
