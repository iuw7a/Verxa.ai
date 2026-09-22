// Verifies the LLM-based flight param extraction against the real NVIDIA API
// with the Arabic message from the bug report.
// Run: npx tsx scripts/test-flyvia-extract.mjs ["<message>"]
import { readFileSync } from "node:fs";

// Minimal .env.local loader (dotenv isn't a project dependency).
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*\"?([^\"#]*)\"?\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {
  /* no .env.local — rely on real env */
}

const message =
  process.argv[2] ?? "شوفي حجزات من بيروت الى دبي بتاريخ ١٠..٩";

const apiKey = process.env.NVIDIA_API_KEY;
if (!apiKey) {
  console.error("NVIDIA_API_KEY missing in env (.env.local)");
  process.exit(1);
}
const baseUrl = (
  process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1"
)
  .trim()
  .replace(/\/+$/, "");
const url = /\/v\d+$/.test(baseUrl) ? baseUrl : `${baseUrl}/v1`;
const model = process.env.NVIDIA_MODEL ?? "meta/llama-3.3-70b-instruct";

const prompt = `You extract flight-search parameters from a user message. The message may be in ANY language (English, German, Arabic, Turkish, French, ...).

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

Today's date: ${new Date().toISOString().slice(0, 10)}.

User message:
"""${message}"""`;

console.log(`Model: ${model}\nMessage: ${message}\n`);

const res = await fetch(`${url}/chat/completions`, {
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
});

if (!res.ok) {
  console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}

// Collect the streamed deltas into one content string.
const text = await res.text();
let content = "";
for (const line of text.split("\n")) {
  const t = line.trim();
  if (!t.startsWith("data:")) continue;
  const data = t.slice(5).trim();
  if (data === "[DONE]") continue;
  try {
    const j = JSON.parse(data);
    content += j.choices?.[0]?.delta?.content ?? "";
  } catch {
    /* ignore */
  }
}
console.log("Raw model output:");
console.log(content || "(empty)");
