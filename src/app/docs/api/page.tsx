"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpenText, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CodeBlock } from "@/components/docs/code-block";

type Snippet = { lang: string; label: string; code: string };

const BASE_URL = "https://www.verxa.de";

/* ------------------------------------------------------------------ */
/* Snippets                                                            */
/* ------------------------------------------------------------------ */

const curlChat = `curl ${BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer vx_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/gpt-oss-20b",
    "messages": [
      { "role": "user", "content": "Explain liquid glass UI in one sentence." }
    ]
  }'`;

const curlStream = `curl ${BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer vx_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/gpt-oss-20b",
    "stream": true,
    "messages": [{ "role": "user", "content": "Write a haiku about APIs." }]
  }'`;

const pythonChat = `import requests

resp = requests.post(
    "${BASE_URL}/v1/chat/completions",
    headers={"Authorization": "Bearer vx_live_YOUR_KEY"},
    json={
        "model": "openai/gpt-oss-20b",
        "messages": [
            {"role": "user", "content": "Explain liquid glass UI in one sentence."}
        ],
    },
    timeout=60,
)
resp.raise_for_status()
print(resp.json()["choices"][0]["message"]["content"])`;

const pythonStream = `import json
import requests

with requests.post(
    "${BASE_URL}/v1/chat/completions",
    headers={"Authorization": "Bearer vx_live_YOUR_KEY"},
    json={
        "model": "openai/gpt-oss-20b",
        "stream": True,
        "messages": [{"role": "user", "content": "Write a haiku about APIs."}],
    },
    stream=True,
    timeout=120,
) as resp:
    for line in resp.iter_lines():
        if not line or not line.startswith(b"data:"):
            continue
        data = line[5:].strip()
        if data == b"[DONE]":
            break
        chunk = json.loads(data)
        delta = chunk["choices"][0]["delta"].get("content", "")
        print(delta, end="", flush=True)`;

const jsChat = `const res = await fetch("${BASE_URL}/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: "Bearer vx_live_YOUR_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user", content: "Hello Verxa!" }],
  }),
});
const data = await res.json();
console.log(data.choices[0].message.content);`;

const jsStream = `const res = await fetch("${BASE_URL}/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: "Bearer vx_live_YOUR_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "openai/gpt-oss-20b",
    stream: true,
    messages: [{ role: "user", content: "Write a haiku about APIs." }],
  }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  for (const line of buffer.split("\\n").slice(0, -1)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (data === "[DONE]") continue;
    process.stdout.write(JSON.parse(data).choices[0].delta.content ?? "");
  }
  buffer = buffer.split("\\n").at(-1) ?? "";
}`;

const nodeSdk = `// npm i openai   — Verxa is OpenAI-compatible
import OpenAI from "openai";

const verxa = new OpenAI({
  apiKey: process.env.VERXA_API_KEY, // vx_live_...
  baseURL: "${BASE_URL}/v1",
});

const stream = await verxa.chat.completions.create({
  model: "openai/gpt-oss-20b",
  messages: [{ role: "user", content: "Hello Verxa!" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`;

const curlModels = `curl ${BASE_URL}/v1/models \\
  -H "Authorization: Bearer vx_live_YOUR_KEY"`;

const curlUsage = `curl ${BASE_URL}/v1/usage \\
  -H "Authorization: Bearer vx_live_YOUR_KEY"`;

/* ------------------------------------------------------------------ */
/* Content model                                                       */
/* ------------------------------------------------------------------ */

type Section = {
  id: string;
  title: string;
  group: string;
  keywords: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "introduction",
    title: "Introduction",
    group: "Getting started",
    keywords: "welcome overview verxa api what is",
    body: (
      <>
        <p>
          The Verxa API gives you programmatic access to Verxa&apos;s models —
          the same engine that powers the Verxa app. It is{" "}
          <strong>OpenAI-compatible</strong>: if you already use an OpenAI SDK,
          point it at Verxa&apos;s base URL and swap the API key.
        </p>
        <p>
          Create a key on the{" "}
          <Link href="/api-keys" className="text-accent hover:underline">
            API Keys
          </Link>{" "}
          page. Keys are shown once at creation and stored only as a SHA-256
          hash.
        </p>
      </>
    ),
  },
  {
    id: "authentication",
    title: "Authentication",
    group: "Getting started",
    keywords: "auth bearer header authorization secret key",
    body: (
      <>
        <p>
          Every request must include your API key in the{" "}
          <code>Authorization</code> header:
        </p>
        <CodeBlock
          label="header"
          code={`Authorization: Bearer vx_live_YOUR_KEY`}
        />
        <p>
          Keys start with <code>vx_live_</code>. If a key is revoked, requests
          fail with <code>403 key_revoked</code>. Keep your key secret — do not
          commit it to git or ship it to the browser.
        </p>
      </>
    ),
  },
  {
    id: "base-url",
    title: "Base URL",
    group: "Getting started",
    keywords: "base url endpoint host",
    body: (
      <>
        <p>All endpoints are relative to this base URL:</p>
        <CodeBlock label="base url" code={BASE_URL} />
        <p>
          Example full endpoint:{" "}
          <code>{`${BASE_URL}/v1/chat/completions`}</code>
        </p>
      </>
    ),
  },
  {
    id: "chat-completions",
    title: "POST /v1/chat/completions",
    group: "Endpoints",
    keywords: "chat completions send message response streaming sse",
    body: (
      <>
        <p>
          Send a conversation, receive a model response. Set{" "}
          <code>stream: true</code> for server-sent events.
        </p>
        <h4>Request body</h4>
        <ul>
          <li>
            <code>model</code> — model id from <code>GET /v1/models</code>{" "}
            (optional, defaults to <code>openai/gpt-oss-20b</code>)
          </li>
          <li>
            <code>messages</code> — required. Array of{" "}
            <code>{"{ role, content }"}</code> where role is{" "}
            <code>user</code>, <code>assistant</code> or <code>system</code>
          </li>
          <li>
            <code>stream</code> — boolean, stream deltas as SSE
          </li>
          <li>
            <code>temperature</code> — 0–1, default <code>0.6</code>
          </li>
          <li>
            <code>max_tokens</code> — default <code>2048</code>, max{" "}
            <code>4096</code>
          </li>
        </ul>
        <CodeBlock label="cURL" code={curlChat} />
        <h4>Streaming</h4>
        <p>
          With <code>stream: true</code> the response is{" "}
          <code>text/event-stream</code> containing SSE chunks like{" "}
          <code>data: {`{...}`}</code>, ending with{" "}
          <code>data: [DONE]</code> — identical to the OpenAI SSE format.
        </p>
        <CodeBlock label="cURL (streaming)" code={curlStream} />
        <h4>Response (non-streaming)</h4>
        <CodeBlock
          label="200 OK"
          code={`{
  "id": "verxa-lz8x2k",
  "object": "chat.completion",
  "model": "openai/gpt-oss-20b",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "…" },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 14, "completion_tokens": 61 }
}`}
        />
      </>
    ),
  },
  {
    id: "models",
    title: "GET /v1/models",
    group: "Endpoints",
    keywords: "models list available",
    body: (
      <>
        <p>List every model available to your key.</p>
        <CodeBlock label="cURL" code={curlModels} />
        <CodeBlock
          label="200 OK"
          code={`{
  "object": "list",
  "data": [
    { "id": "openai/gpt-oss-20b", "object": "model", "owned_by": "verxa" },
    { "id": "google/gemma-4-31b-it", "object": "model", "owned_by": "verxa" }
  ]
}`}
        />
      </>
    ),
  },
  {
    id: "usage",
    title: "GET /v1/usage",
    group: "Endpoints",
    keywords: "usage stats requests tokens quota",
    body: (
      <>
        <p>
          Daily usage for the key you authenticate with — requests and token
          counts for the last 30 days, plus your plan&apos;s rate limits.
        </p>
        <CodeBlock label="cURL" code={curlUsage} />
        <CodeBlock
          label="200 OK"
          code={`{
  "plan": "free",
  "limits": { "requestsPerMinute": 10, "requestsPerDay": 200 },
  "days": [
    { "day": "2026-09-14", "requests": 12, "tokens_in": 830, "tokens_out": 2410 }
  ],
  "totals": { "requests": 12, "tokens_in": 830, "tokens_out": 2410 }
}`}
        />
      </>
    ),
  },
  {
    id: "code-examples",
    title: "Code examples",
    group: "Guides",
    keywords: "examples curl python javascript node sdk",
    body: (
      <>
        <h4>Python</h4>
        <CodeBlock label="Python" code={pythonChat} />
        <CodeBlock label="Python (streaming)" code={pythonStream} />
        <h4>JavaScript / Node.js</h4>
        <CodeBlock label="JavaScript" code={jsChat} />
        <CodeBlock label="Node.js (streaming)" code={jsStream} />
        <h4>Use the OpenAI SDK</h4>
        <p>
          Because the API is OpenAI-compatible, the official SDK works out of
          the box:
        </p>
        <CodeBlock label="Node.js + openai SDK" code={nodeSdk} />
      </>
    ),
  },
  {
    id: "rate-limits",
    title: "Rate limits",
    group: "Guides",
    keywords: "rate limits quota plan free pro requests per minute day",
    body: (
      <>
        <p>Limits are per API key and enforced per calendar day (UTC):</p>
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Keys</th>
              <th>Requests / min</th>
              <th>Requests / day</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Free</td>
              <td>1</td>
              <td>10</td>
              <td>200</td>
            </tr>
            <tr>
              <td>Pro</td>
              <td>Unlimited</td>
              <td>120</td>
              <td>20,000</td>
            </tr>
          </tbody>
        </table>
        <p>
          Exceeding the daily limit returns{" "}
          <code>429 rate_limit_exceeded</code>. Upgrade on the{" "}
          <Link href="/account/subscription" className="text-accent hover:underline">
            subscription page
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "errors",
    title: "Error codes",
    group: "Guides",
    keywords: "errors codes 401 403 429 500 502 invalid key revoked",
    body: (
      <>
        <p>
          Errors use a stable machine-readable <code>code</code> plus a human
          message:
        </p>
        <CodeBlock
          label="401 Unauthorized"
          code={`{
  "error": {
    "code": "invalid_api_key",
    "message": "Invalid or expired API key."
  }
}`}
        />
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Code</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>401</td>
              <td>missing_api_key</td>
              <td>No Authorization header provided.</td>
            </tr>
            <tr>
              <td>401</td>
              <td>invalid_api_key</td>
              <td>Key does not exist or was mistyped.</td>
            </tr>
            <tr>
              <td>403</td>
              <td>key_revoked</td>
              <td>Key was revoked in the dashboard.</td>
            </tr>
            <tr>
              <td>400</td>
              <td>invalid_request</td>
              <td>Malformed JSON or missing messages.</td>
            </tr>
            <tr>
              <td>429</td>
              <td>rate_limit_exceeded</td>
              <td>Plan rate limit reached — retry later.</td>
            </tr>
            <tr>
              <td>500</td>
              <td>server_config</td>
              <td>Verxa server misconfiguration.</td>
            </tr>
            <tr>
              <td>502</td>
              <td>upstream_error</td>
              <td>Model backend failed — retry shortly.</td>
            </tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: "sdks",
    title: "SDKs",
    group: "Guides",
    keywords: "sdk libraries coming soon client",
    body: (
      <>
        <p>
          First-class Verxa SDKs for JavaScript/TypeScript and Python are{" "}
          <strong>coming soon</strong>. Until then, use any OpenAI-compatible
          client (see the example above) or plain HTTP.
        </p>
      </>
    ),
  },
];

const GROUPS = ["Getting started", "Endpoints", "Guides"];

export default function ApiDocsPage() {
  const [active, setActive] = useState("introduction");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(query) || s.keywords.includes(query),
    );
  }, [q]);

  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  return (
    <AppShell
      topBar={
        <Link
          href="/api-keys"
          className="rounded-full border border-line px-4 py-1.5 text-[13px] text-muted transition hover:text-ink"
        >
          API Keys
        </Link>
      }
    >
      <div className="mx-auto w-full max-w-[1000px] px-2 py-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-line bg-white/[0.04]">
            <BookOpenText size={19} className="text-accent" />
          </span>
          <div>
            <h1 className="text-[22px] font-medium tracking-[-0.02em] text-ink">
              API Documentation
            </h1>
            <p className="text-[13.5px] text-muted">
              Build with the Verxa API — OpenAI-compatible REST endpoints.
            </p>
          </div>
        </div>

        <div className="mt-7 flex gap-8">
          {/* Sidebar */}
          <aside className="hidden w-[230px] shrink-0 md:block">
            <div className="sticky top-8">
              <div className="flex items-center gap-2 rounded-[12px] border border-line bg-white/[0.03] px-3 py-2">
                <Search size={14} className="shrink-0 text-faint" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search docs…"
                  className="h-6 w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
                />
              </div>
              <nav className="mt-4 space-y-4">
                {GROUPS.map((group) => {
                  const items = filtered.filter((s) => s.group === group);
                  if (!items.length) return null;
                  return (
                    <div key={group}>
                      <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-faint">
                        {group}
                      </p>
                      <div className="space-y-0.5">
                        {items.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setActive(s.id)}
                            className={`block w-full rounded-[9px] px-3 py-1.5 text-left text-[13px] transition ${
                              active === s.id
                                ? "bg-accent-soft font-medium text-accent"
                                : "text-muted hover:text-ink"
                            }`}
                          >
                            {s.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 ? (
                  <p className="px-3 text-[12.5px] text-faint">
                    No matches for “{q}”.
                  </p>
                ) : null}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1">
            {/* Mobile section switcher */}
            <div className="mb-5 flex gap-2 overflow-x-auto md:hidden">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] ${
                    active === s.id
                      ? "bg-accent-soft font-medium text-accent"
                      : "border border-line text-muted"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <article className="min-h-[480px]">
              <h2 className="text-[19px] font-medium tracking-[-0.02em] text-ink">
                {section.title}
              </h2>
              <div className="prose-api mt-4 space-y-4 text-[14.5px] leading-7 text-muted [&_code]:rounded-[6px] [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-[#c9d2ff] [&_h4]:mt-6 [&_h4]:text-[14px] [&_h4]:font-medium [&_h4]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_td]:text-[13.5px] [&_th]:border [&_th]:border-line [&_th]:bg-white/[0.03] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[12.5px] [&_th]:font-medium [&_th]:text-ink">
                {section.body}
              </div>

              {/* Prev / next */}
              <div className="mt-10 flex items-center justify-between border-t border-line pt-5">
                {SECTIONS.indexOf(section) > 0 ? (
                  <button
                    onClick={() =>
                      setActive(SECTIONS[SECTIONS.indexOf(section) - 1].id)
                    }
                    className="text-[13.5px] text-muted hover:text-ink"
                  >
                    ← {SECTIONS[SECTIONS.indexOf(section) - 1].title}
                  </button>
                ) : (
                  <span />
                )}
                {SECTIONS.indexOf(section) < SECTIONS.length - 1 ? (
                  <button
                    onClick={() =>
                      setActive(SECTIONS[SECTIONS.indexOf(section) + 1].id)
                    }
                    className="text-[13.5px] text-accent hover:underline"
                  >
                    {SECTIONS[SECTIONS.indexOf(section) + 1].title} →
                  </button>
                ) : (
                  <span />
                )}
              </div>
            </article>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
