import "server-only";

/**
 * LLM-based extraction of flight-search parameters.
 *
 * The regex extractor in flyvia.ts only understands English/German phrasing.
 * For any other language (e.g. Arabic "شوفي حجزات من بيروت الى دبي بتاريخ ١٠..٩")
 * it finds nothing — so as a fallback we ask the configured NVIDIA chat model
 * to extract structured JSON. The model sees the raw user text in its original
 * language, which makes this extraction language-proof.
 */

export type ExtractedFlightParams = {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  cabin?: string;
};

const EXTRACTION_PROMPT = `You extract flight-search parameters from a user message. The message may be in ANY language (English, German, Arabic, Turkish, French, ...).

Return ONLY a JSON object (no markdown, no prose) with these optional keys:
- "origin": departure CITY NAME in English or 3-letter IATA code (e.g. "Berlin", "BEY")
- "destination": arrival CITY NAME in English or 3-letter IATA code (e.g. "Istanbul", "DXB")
- "departureDate": departure date as YYYY-MM-DD
- "returnDate": return date as YYYY-MM-DD, or omit for one-way
- "passengers": integer 1-9, omit if not stated
- "cabin": one of "economy", "premium_economy", "business", "first", omit if not stated

Rules:
- Resolve relative dates ("next Friday", "tomorrow", "next week") against today's date given below.
- Parse dates in any locale/format: "20. September", "September 20", "09/20", "١٠..٩" (Arabic-Indic digits), "10 Sep 2026".
- If a year is not stated, choose the next occurrence of that date from today (past dates mean next year).
- Use null or omit keys you cannot determine confidently. NEVER guess a city or date that is not clearly implied.

Today's date: {{TODAY}}.

User message:
"""{{MESSAGE}}"""`;

function extractJson(text: string): ExtractedFlightParams | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const out: ExtractedFlightParams = {};
    const str = (k: string) =>
      typeof parsed[k] === "string" && (parsed[k] as string).trim()
        ? (parsed[k] as string).trim()
        : undefined;
    out.origin = str("origin");
    out.destination = str("destination");
    out.departureDate = str("departureDate");
    out.returnDate = str("returnDate");
    if (typeof parsed.passengers === "number" && parsed.passengers >= 1) {
      out.passengers = Math.min(Math.floor(parsed.passengers), 9);
    }
    const cabin = str("cabin");
    if (cabin && ["economy", "premium_economy", "business", "first"].includes(cabin)) {
      out.cabin = cabin;
    }
    return out;
  } catch {
    return null;
  }
}

/** Normalizes city names / codes so they can flow into validateSearchArgs. */
export function normalizeExtracted(p: ExtractedFlightParams): ExtractedFlightParams {
  const clean = (v?: string) => v?.trim().replace(/^[\"'„“]+|[\"'„“]+$/g, "");
  return {
    origin: clean(p.origin),
    destination: clean(p.destination),
    departureDate: clean(p.departureDate),
    returnDate: clean(p.returnDate),
    passengers: p.passengers,
    cabin: p.cabin,
  };
}

/**
 * Calls the chat model to extract flight params. Returns null on any failure —
 * the caller then falls back to asking the user for missing details.
 */
export async function extractFlightParamsWithLLM(
  message: string,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<ExtractedFlightParams | null> {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = EXTRACTION_PROMPT.replace("{{TODAY}}", today).replace(
    "{{MESSAGE}}",
    message.slice(0, 800),
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 2048,
        stream: true,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok || !res.body) return null;

    // Collect streamed deltas (reasoning models like gpt-oss only emit via
    // streaming; a non-stream request can return an empty content string).
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
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
          content += json.choices?.[0]?.delta?.content ?? "";
        } catch {
          /* ignore malformed chunks */
        }
      }
    }
    if (!content) return null;
    const parsed = extractJson(content);
    return parsed ? normalizeExtracted(parsed) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
