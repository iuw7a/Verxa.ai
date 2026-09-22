import { NextRequest } from "next/server";
import { buildSearchQuery, needsWebSearch } from "@/lib/utils";
import { webSearch } from "@/lib/search";
import { DEFAULT_MODEL_ID, isKnownModel, providerForModel } from "@/lib/models";
import {
  FlyviaError,
  buildFlyviaDeepLink,
  cityNameToIata,
  detectFlyviaRequest,
  searchFlights,
  validateSearchArgs,
} from "@/lib/flyvia";
import { extractFlightParamsWithLLM } from "@/lib/flyvia-extract";
import { detectIntegrationRequest } from "@/lib/integrations/detect";
import { runReachTool } from "@/lib/reach/run";
import { detectMediaIntent } from "@/lib/media-intent";
import { getAuthenticatedUserId } from "@/lib/integrations/store";
import { isAgnesConfigured, agnesGenerateImage, agnesSubmitVideo, type AgnesVideoOptions } from "@/lib/agnes";

export const runtime = "nodejs";
export const maxDuration = 300;

type IncomingMessage = { role: "user" | "assistant" | "system"; content: string };

/**
 * Normalizes the configured base URL so we always hit `<host>/v1/chat/completions`.
 * - strips trailing slashes (avoids `//chat/completions` 404s)
 * - appends `/v1` when the configured URL omits it (a common misconfiguration)
 */
function normalizeBaseUrl(raw: string) {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

function encodeEvent(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    messages?: IncomingMessage[];
    personalization?: {
      customInstructions?: string;
      tone?: string;
      responseLength?: string;
    };
    memories?: string[];
    enableSearch?: boolean;
    model?: string;
    flyvia?: {
      origin?: string;
      destination?: string;
      departureDate?: string;
      returnDate?: string | null;
      passengers?: number;
      cabin?: string;
    } | null;
    /** Explicit Image/Video composer mode — makes generation intent unambiguous. */
    mediaMode?: "image" | "video" | null;
    /** User-selected video options (model / duration / aspect ratio). */
    videoOptions?: AgnesVideoOptions;
  };

  // Honor the client's model choice when it's in the registry;
  // anything else (unknown/garbage) falls back to the server default.
  const envModel = process.env.NVIDIA_MODEL ?? DEFAULT_MODEL_ID;
  const model =
    body.model && isKnownModel(body.model) ? body.model : envModel;

  // Two gateways: NVIDIA models → build.nvidia.com key, everything else → xKiro.
  // No cross-provider fallback: an NVIDIA key sent to xKiro (or vice versa)
  // is always rejected with 401 and only obscures the real cause (missing key).
  const provider = providerForModel(model);
  // Trim: pasted keys sometimes carry whitespace or a BOM (U+FEFF), which
  // makes undici throw "Cannot convert argument to a ByteString" on send.
  const rawKey =
    provider === "nvidia" ? process.env.NVIDIA_API_KEY : process.env.XKIRO_API_KEY;
  const apiKey = rawKey?.trim() || undefined;
  const baseUrl = normalizeBaseUrl(
    provider === "nvidia"
      ? (process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1")
      : (process.env.XKIRO_BASE_URL ?? "https://api.xkiro.com/v1"),
  );

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          provider === "nvidia"
            ? "Chat API is not configured (NVIDIA_API_KEY missing)."
            : "Chat API is not configured (XKIRO_API_KEY missing).",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const messages = body.messages?.filter((m) => m.content?.trim()) ?? [];
  if (!messages.length) {
    return new Response(JSON.stringify({ error: "Message required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const shouldSearch =
    body.enableSearch !== false && lastUser && needsWebSearch(lastUser.content);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(encodeEvent(payload)));

      try {
        send({ type: "status", value: "thinking" });

        // ---- Media generation: explicit composer mode or natural intent ----
        // Images AND videos run exclusively on the Agnes key (fast, free).
        // Videos: async task submission, client polls /api/generate/video.
        const mediaMode = body.mediaMode ?? detectMediaIntent(lastUser!.content);
        if (mediaMode === "image" && isAgnesConfigured()) {
          const prompt = lastUser!.content.trim();
          send({ type: "status", value: "generating_image" });
          // Show the branded generating card right away (sync generation can
          // take 30s+; without this the chat just sits on the status line).
          send({ type: "media", kind: "image", prompt, state: "generating" });
          const r = await agnesGenerateImage(prompt);
          if (r.ok) {
            send({ type: "media", kind: "image", prompt, state: "done", url: r.url });
            send({ type: "done" });
            controller.close();
            return;
          }
          send({ type: "media", kind: "image", prompt, state: "error", error: r.message });
          send({ type: "done" });
          controller.close();
          return;
        }
        if (mediaMode === "video" && isAgnesConfigured()) {
          const prompt = lastUser!.content.trim();
          send({ type: "status", value: "generating_video" });
          const sub = await agnesSubmitVideo(prompt, body.videoOptions ?? null);
          if (sub.ok) {
            send({
              type: "media",
              kind: "video",
              prompt,
              state: "generating",
              agnesVideoId: sub.videoId,
              videoModel: sub.model,
              videoOptions: body.videoOptions ?? undefined,
            });
            send({ type: "done" });
            controller.close();
            return;
          }
          send({ type: "media", kind: "video", prompt, state: "error", error: sub.message });
          send({ type: "done" });
          controller.close();
          return;
        }
        if (mediaMode && !isAgnesConfigured()) {
          send({
            type: "media",
            kind: mediaMode,
            prompt: lastUser!.content.trim(),
            state: "error",
            error: "Media generation is not configured on this server.",
          });
          send({ type: "done" });
          controller.close();
          return;
        }

        // (legacy async submission block removed — media is handled directly above)

        // ---- Integration tools: Gmail / Calendar / Drive via secure backend ----
        // Tool results are ALSO injected into the model context below — the
        // model must see the real data to summarize it.
        let integrationDataText: string | null = null;
        const integrationReq = detectIntegrationRequest(lastUser!.content);
        if (integrationReq?.kind === "tool") {
          const origin = req.nextUrl.origin;
          const cookieHeader = req.headers.get("cookie") ?? "";
          const gateRes = await fetch(
            `${origin}/api/integrations/${integrationReq.provider}/ai-gate`,
            { headers: { cookie: cookieHeader }, cache: "no-store" },
          );
          const gate = (await gateRes.json()) as {
            usable: boolean;
            reason?: string;
            userMessage?: string;
            account?: string | null;
          };
          if (!gate.usable) {
            // Clear UI action: the client shows a Connect prompt.
            send({
              type: "connect_prompt",
              provider: integrationReq.provider,
              reason: gate.reason ?? "not_connected",
              message: gate.userMessage ?? `Connect ${integrationReq.provider} to use this.`,
            });
          } else if (integrationReq.tool !== "gmail_draft") {
            // Execute the real tool through the authenticated endpoint.
            const toolRes = await fetch(
              `${origin}/api/integrations/${integrationReq.provider}/tools/${integrationReq.tool}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  cookie: cookieHeader,
                },
                body: JSON.stringify({ query: integrationReq.query }),
                cache: "no-store",
              },
            );
            const toolJson = (await toolRes.json()) as {
              ok: boolean;
              data?: unknown;
              message?: string;
              code?: string;
              reconnect?: boolean;
            };
            if (toolJson.ok) {
              integrationDataText = JSON.stringify(toolJson.data).slice(0, 6000);
              send({
                type: "integration_data",
                provider: integrationReq.provider,
                tool: integrationReq.tool,
                data: toolJson.data,
              });
            } else if (toolJson.reconnect) {
              send({ type: "connect_prompt", provider: integrationReq.provider, reason: toolJson.code, message: toolJson.message });
            } else {
              send({ type: "integration_error", message: toolJson.message ?? "The integration tool failed." });
            }
          }
          // gmail_draft: composed by the model below; sending always requires
          // the user's explicit confirmation (never auto-sent).
        }

        // ---- Flyvia tool: detect @Flyvia flight-search requests ----
        const flyviaMention = detectFlyviaRequest(messages);
        if (flyviaMention) {
          const params = { ...flyviaMention.params, ...body.flyvia };
          const hasRequired = params.origin && params.destination && params.departureDate;

          // The regex extractor is EN/DE-only. If required params are still
          // missing, fall back to LLM extraction which works in ANY language
          // (e.g. Arabic "شوفي حجزات من بيروت الى دبي بتاريخ ١٠..٩").
          if (!hasRequired) {
            send({ type: "status", value: "thinking" });
            const extracted = await extractFlightParamsWithLLM(
              lastUser!.content,
              apiKey,
              baseUrl,
              model,
            );
            if (extracted) {
              // Only fill gaps — an explicit user value always wins.
              params.origin ??= extracted.origin;
              params.destination ??= extracted.destination;
              params.departureDate ??= extracted.departureDate;
              params.returnDate ??= extracted.returnDate ?? undefined;
              params.passengers ??= extracted.passengers;
              params.cabin ??= extracted.cabin;
            }
          }

          // City names from LLM extraction ("Beirut", "Dubai") → IATA codes.
          const cityToIata = (v?: string | null): string | undefined => {
            if (!v) return undefined;
            const t = v.trim().toUpperCase();
            return /^[A-Z]{3}$/.test(t) ? t : (cityNameToIata(v) ?? undefined);
          };
          params.origin = cityToIata(params.origin);
          params.destination = cityToIata(params.destination);

          const stillMissing = !params.origin || !params.destination || !params.departureDate;
          if (stillMissing) {
            send({
              type: "flyvia_need_info",
              missing: {
                origin: !params.origin,
                destination: !params.destination,
                departureDate: !params.departureDate,
              },
            });
          } else {
            send({ type: "status", value: "searching_flights" });
            try {
              const args = validateSearchArgs(params as never);
              const result = await searchFlights(args);
              send({
                type: "flights",
                flights: {
                  origin: args.origin,
                  destination: args.destination,
                  departureDate: args.departureDate,
                  returnDate: args.returnDate ?? null,
                  passengers: args.passengers ?? 1,
                  cabin: args.cabin,
                  provider: result.provider,
                  dataSource: result.dataSource,
                  deepLink: buildFlyviaDeepLink(args),
                  offers: result.flights.map((f) => ({
                    id: f.id,
                    price: f.price.total,
                    currency: f.price.currency,
                    outbound: f.outbound,
                    inbound: f.inbound ?? undefined,
                    bookingUrl: buildFlyviaDeepLink(args),
                  })),
                },
              });
            } catch (err) {
              const msg =
                err instanceof FlyviaError
                  ? err.message
                  : "Flight search failed unexpectedly.";
              send({ type: "flyvia_error", message: msg });
            }
          }
        }

        let sources: { title: string; url: string; snippet?: string }[] = [];
        if (shouldSearch) {
          const hasSearchProvider = Boolean(
            process.env.LANGSEARCH_API_KEY ||
              process.env.SERPAPI_API_KEY ||
              process.env.WEB_SEARCH_API_KEY,
          );
          if (!hasSearchProvider) {
            console.warn(
              "[chat] Search wanted but no provider configured — set LANGSEARCH_API_KEY (.env.local, restart dev server).",
            );
            send({ type: "search_unavailable" });
          } else {
            await new Promise((r) => setTimeout(r, 220));
            send({ type: "status", value: "searching" });
            sources = await webSearch(buildSearchQuery(lastUser!.content));
            if (sources.length) {
              send({ type: "status", value: "reading" });
              send({ type: "sources", sources });
              await new Promise((r) => setTimeout(r, 280));
            }
          }
        }

        // 2b. Internet tools (agent-reach server edition): direct reads for
        // pages, YouTube, GitHub, Reddit, RSS. Runs after generic search and
        // appends its text to the sources so the model cites it.
        // 2b2. Browser agent (browser-use server edition): when the user asks
        // the AI to really OPEN a page (open/browse/click + URL), offer the
        // browser agent instead of pretending — never claim to have clicked.
        const reach = await runReachTool(lastUser!.content).catch(() => null);
        if (reach) {
          if (reach.sources.length && !sources.length) {
            send({ type: "status", value: "reading" });
            send({ type: "sources", sources: reach.sources });
          }
          if (reach.sources.length) sources = [...sources, ...reach.sources].slice(0, 8);
          sources = [
            ...sources,
            ...(reach.text
              ? [{ title: "Internet tool result", url: "", snippet: reach.text.slice(0, 9000) }]
              : []),
          ].slice(0, 9);
        }

        // Browser-agent hint (browser-use server edition): opening/clicking
        // pages live needs the E2B browser session — the chat model must
        // offer it, never fake it.
        const { detectBrowserAgentRequest } = await import("@/lib/browser-agent/detect");
        const { browserAgentEnabled } = await import("@/lib/browser-agent/browser");
        const browseReq = detectBrowserAgentRequest(lastUser!.content);
        // Deferred: pushed into systemParts right after its declaration below.
        const browseHint = browseReq
          ? `BROWSER AGENT AVAILABLE: The user wants you to really OPEN/BROWSE a page (${browseReq.startUrl}). You cannot click or see live pages yourself. ` +
            (browserAgentEnabled()
              ? `A real headless-Chromium browser agent exists at POST /api/tools/browser-agent (body: {"goal","url"}). Tell the user briefly what the browser agent would do on that page and offer to run it — do NOT claim you already opened or clicked anything.`
              : `No browser sandbox is configured (E2B_API_KEY missing), so live browsing is unavailable right now. Offer the page-reader summary from the sources instead, and say live clicking is disabled until the admin configures it.`)
          : null;

        send({ type: "status", value: "preparing" });

        const systemParts = [
          "You are Verxa, a calm, precise, premium AI assistant.",
          "Write clearly. Prefer short paragraphs. Use markdown when it helps.",
          "When comparing options, render a GitHub-flavored markdown table.",
          "Cite sources inline as [title](url) when web results are provided.",
          "Do not claim to be Claude, Gemini, ChatGPT, or NVIDIA.",
        ];

        // Browser-agent hint (deferred from above — systemParts exists now).
        if (browseHint) systemParts.push(browseHint);

        // Flyvia tool guidance for the model.
        if (flyviaMention) {
          systemParts.push(
            "FLYVIA FLIGHT SEARCH CONTEXT:",
            "The user asked for a flight search via Flyvia. The system already ran the search server-side. Real results are rendered by the UI as flight cards — the user sees them as visual cards, not text.",
            "CRITICAL: NEVER list flights, airlines, prices, times, or flight tables yourself. NEVER fabricate flight data, sample prices, or example schedules. If you output any flight table or price list, that is a serious error — real cards are already on screen.",
            "If results were found: reply with a 1–2 sentence summary in the user's language (e.g. mention the cheapest option only), then note they can view and book each result via the flight cards / on Flyvia.",
            "If a flyvia_need_info event was emitted: briefly ask the user for exactly the missing details (origin, destination, or date) — nothing else, no examples, no sample flights.",
            "If a flyvia_error event was emitted: apologize briefly and suggest retrying. Do not guess any flight data.",
            "Follow-up requests (e.g. 'only direct flights', 'cheaper', 'after 18:00', 'change destination to Paris') refer to the previous search — restate the refined request briefly so the system can re-run it.",
          );
        }

        // Truthfulness rules apply ALWAYS — hallucinated venue tables like the
        // "hamburg dubai 22.10" bug must be impossible with or without search.
        systemParts.push(
          `Today's date is ${new Date().toISOString().slice(0, 10)}.`,
          "NEVER fabricate facts, statistics, companies, products, prices, opening hours, schedules, URLs, or citations. If you are not certain about specific details, say clearly what you don't know — do NOT fill gaps with plausible-sounding specifics.",
          "NEVER output a detailed listing/table of real-world venues, restaurants, hotels, shops, or events with hours, prices, or addresses unless that data was provided to you in this conversation (e.g. from web search results). General well-known knowledge is fine; invented specifics are not.",
        );

        // Integration tool guidance for the model.
        if (integrationReq?.kind === "tool") {
          systemParts.push(
            "INTEGRATION TOOL CONTEXT:",
            "The system may have already executed a secure backend tool (email list/search/read) — real data may have been delivered in an integration_data event. Summarize that data concisely; do NOT invent emails, senders, subjects, or dates.",
            "If a connect_prompt event was emitted, the user has NOT connected the integration. Briefly tell them they need to connect it first — a connect card is shown in the UI. Do not pretend you checked anything.",
            "Drafting emails: compose the draft text when asked, but ALWAYS end by asking for explicit confirmation before anything would be sent. Verxa never sends email without the user's explicit go-ahead.",
            "Never mention, hint at, or output OAuth tokens, access tokens, or credentials — you never see them.",
          );
        }

        if (body.personalization?.customInstructions) {
          systemParts.push(
            `What to know about the user: ${body.personalization.customInstructions}`,
          );
        }
        if (body.personalization?.tone) {
          systemParts.push(`Preferred tone: ${body.personalization.tone}.`);
        }
        if (body.personalization?.responseLength) {
          systemParts.push(
            `Preferred response length: ${body.personalization.responseLength}.`,
          );
        }
        if (body.memories?.length) {
          systemParts.push(`Remembered details:\n- ${body.memories.join("\n- ")}`);
        }
        if (sources.length) {
          systemParts.push(
            `The user asked about: "${lastUser!.content.slice(0, 200)}"`,
            `Web sources found for that query:\n${sources
              .map((s, i) => `${i + 1}. ${s.title} — ${s.url}\n${s.snippet ?? ""}`)
              .join("\n")}`,
            "STRICT RELEVANCE RULE: Before using any source, check whether it actually matches the user's subject. Ignore results that are about a different topic, company, place, or person merely because the name sounds similar. If none of the sources genuinely cover the asked subject, respond that you could not find reliable information about it — do NOT switch to a similar-sounding topic and do NOT fill gaps with general knowledge. Never invent sources, facts, prices, or URLs.",
          );
        } else if (shouldSearch) {
          systemParts.push(
            "A web search was attempted for this message but returned no usable results. Do NOT invent sources, facts, prices, or URLs. If you don't know, say you couldn't verify this and answer only from what you're confident about, clearly labeled.",
          );
        }

        const nvidiaMessages: { role: string; content: string }[] = [
          { role: "system", content: systemParts.join("\n") },
        ];
        if (integrationDataText) {
          nvidiaMessages.push({
            role: "system",
            content: `REAL TOOL DATA (fetched by a secure backend tool for the user's request; summarize it faithfully — do NOT invent emails, senders, or dates):\n${integrationDataText}`,
          });
        }
        nvidiaMessages.push(...messages.map((m) => ({ role: m.role, content: m.content })));

        const tryModels =
          provider === "nvidia"
            ? [model, "openai/gpt-oss-20b", "nvidia/nemotron-3.5-lightning-30b-a3b"]
            : [model, "mistralai/mistral-small-2603", "qwen/qwen3.5-flash:free"];
        let nvidiaRes: Response | null = null;
        const attempts: string[] = [];

        for (const candidate of tryModels) {
          const url = `${baseUrl}/chat/completions`;
          try {
            nvidiaRes = await fetch(url, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                Accept: "text/event-stream",
              },
              body: JSON.stringify({
                model: candidate,
                messages: nvidiaMessages,
                temperature: 0.6,
                top_p: 0.9,
                max_tokens: 4096,
                stream: true,
              }),
              signal: req.signal,
            });
          } catch (err) {
            const thrown =
              err instanceof Error ? `${err.name}: ${err.message}` : String(err);
            attempts.push(`${candidate} → FETCH THREW ${thrown}`);
            console.error(`[chat] upstream fetch threw for ${url}: ${thrown}`);
            continue;
          }
          if (nvidiaRes.ok && nvidiaRes.body) break;
          const errText = (await nvidiaRes.text().catch(() => ""))
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 200);
          attempts.push(`${candidate} → HTTP ${nvidiaRes.status}${errText ? `: ${errText}` : ""}`);
          console.error(`[chat] upstream failure for ${url}: HTTP ${nvidiaRes.status} ${errText}`);
        }

        if (!nvidiaRes || !nvidiaRes.ok || !nvidiaRes.body) {
          const detail = attempts.join(" | ");
          const hint =
            attempts.some((a) => a.includes("HTTP 401"))
              ? "API key was rejected (401). The server key for this gateway is missing or invalid — check XKIRO_API_KEY / NVIDIA_API_KEY in the server environment."
              : attempts.some((a) => a.includes("HTTP 403"))
                ? "Model not available for this key (tier locked). Pick another model at the bottom of the chat page."
                : attempts.some((a) => a.includes("HTTP 410"))
                ? "Model retired by the provider (HTTP 410). Pick another model below."
                : attempts.some((a) => a.includes("HTTP 404"))
                  ? "Model endpoint not found (404). Pick another model below."
                  : "The model could not complete this request.";
          send({
            type: "error",
            message: detail ? `${hint} (${detail})` : hint,
          });
          send({ type: "done" });
          controller.close();
          return;
        }

        const reader = nvidiaRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let sawContent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                sawContent = true;
                send({ type: "delta", text: delta });
              }
            } catch {
              /* ignore malformed chunks */
            }
          }
        }

        // Reasoning models (gpt-oss etc.) can burn the entire token budget on
        // hidden thinking and stream zero visible content. If nothing arrived,
        // retry once non-streaming — that path always returns full content.
        if (!sawContent) {
          const retry = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: tryModels[0],
              messages: nvidiaMessages,
              temperature: 0.5,
              max_tokens: 4096,
              stream: false,
            }),
            signal: req.signal,
          }).catch(() => null);
          const j = (retry && retry.ok ? await retry.json().catch(() => null) : null) as {
            choices?: { message?: { content?: string } }[];
          } | null;
          const text = j?.choices?.[0]?.message?.content;
          if (typeof text === "string" && text.trim()) {
            send({ type: "delta", text: text.trim() });
          } else {
            send({ type: "error", message: "The model returned no content. Try again or pick a different model." });
          }
        }

        send({ type: "done" });
        controller.close();
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          send({ type: "done" });
          controller.close();
          return;
        }
        console.error(
          "[chat] stream failed:",
          error instanceof Error
            ? `${error.name}: ${error.message} :: ${(error.stack ?? "").slice(0, 600)}`
            : String(error),
        );
        send({
          type: "error",
          message: "Something went wrong while generating a reply.",
        });
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
