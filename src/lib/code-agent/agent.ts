import { TOOL_DEFS, executeTool, type ToolResult } from "./tools";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verxa Code agent core (Phase 2.3 + 6.1/6.2).
 * All model calls go through CodeAgentProvider — swap the class to change
 * models without touching agent logic.
 */

export type ChatMsg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string };

export type ToolCall = { id: string; name: string; args: Record<string, unknown> };

export type TurnResult = {
  content: string;
  toolCalls: ToolCall[];
  fallbackUsed: boolean;
};

export interface CodeAgentProvider {
  readonly label: string;
  generate(messages: ChatMsg[], tools: typeof TOOL_DEFS, signal?: AbortSignal): Promise<TurnResult>;
}

export class GatewayError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function gatewayBase(): string {
  const raw = (process.env.XKIRO_BASE_URL ?? "https://api.xkiro.com/v1").trim().replace(/\/+$/, "");
  return /\/v\d+$/.test(raw) ? raw : `${raw}/v1`;
}

function gatewayKey(): string | null {
  const k = process.env.XKIRO_API_KEY?.trim().replace(/^[\uFEFF\s]+|[\uFEFF\s]+$/g, "");
  return k ? k : null;
}

function nvidiaBase(): string {
  const raw = (process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1").trim().replace(/\/+$/, "");
  return /\/v\d+$/.test(raw) ? raw : `${raw}/v1`;
}

function nvidiaKey(): string | null {
  const k = process.env.NVIDIA_API_KEY?.trim().replace(/^[\uFEFF\s]+|[\uFEFF\s]+$/g, "");
  return k ? k : null;
}

function nvidiaModel(): string {
  return (process.env.NVIDIA_MODEL ?? "openai/gpt-oss-20b").trim() || "openai/gpt-oss-20b";
}

type UpstreamChoice = {
  message?: { content?: string | null; tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[] };
};

async function callCompletions(
  model: string,
  messages: ChatMsg[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: any,
  signal?: AbortSignal,
  gateway?: { base: string; key: string | null },
): Promise<UpstreamChoice> {
  const base = gateway?.base ?? gatewayBase();
  const key = gateway ? gateway.key : gatewayKey();
  if (!key) throw new GatewayError(500, "Model gateway key is not configured on the server.");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 8192, tools, stream: false }),
    signal: signal ?? AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const text = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
    throw new GatewayError(res.status, `Model request failed: HTTP ${res.status}${text ? ` ${text}` : ""}`);
  }
  const json = (await res.json()) as { choices?: UpstreamChoice[] };
  return json.choices?.[0] ?? {};
}

/** Default provider: Qwen3-Coder-Plus (free tier), then flash, then NVIDIA. */
export class QwenCoderProvider implements CodeAgentProvider {
  readonly label = "qwen3-coder-plus";
  constructor(
    private primary = process.env.CODE_MODEL ?? "qwen/qwen3-coder-plus:free",
    private fallback = process.env.CODE_FALLBACK_MODEL ?? "qwen/qwen3.5-flash:free",
  ) {}

  async generate(messages: ChatMsg[], tools: typeof TOOL_DEFS, signal?: AbortSignal): Promise<TurnResult> {
    const nKey = nvidiaKey();
    const candidates: { model: string; gateway?: { base: string; key: string | null } }[] = [
      { model: this.primary },
      ...(this.fallback !== this.primary ? [{ model: this.fallback }] : []),
      ...(nKey ? [{ model: nvidiaModel(), gateway: { base: nvidiaBase(), key: nKey } }] : []),
    ];
      let lastError: unknown = null;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      // Retry the same model once on transient gateway errors (502/503/504),
      // then move on to the next candidate.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return { ...(await this.turn(c.model, messages, tools, signal, c.gateway)), fallbackUsed: i > 0 || attempt > 0 };
        } catch (e) {
          const transient = e instanceof GatewayError && (e.status === 429 || e.status >= 500);
          if (!transient) throw e;
          lastError = e;
          console.error(`[code-agent] ${c.model} failed (HTTP ${(e as GatewayError).status}, attempt ${attempt + 1}/2).`);
          if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
    const status = lastError instanceof GatewayError ? lastError.status : 429;
    throw new GatewayError(
      status,
      status === 429
        ? "All code models are rate-limited right now."
        : "The model gateway is overloaded right now (timeouts on all models). Please try again in a minute.",
    );
  }

  private async turn(model: string, messages: ChatMsg[], tools: typeof TOOL_DEFS, signal?: AbortSignal, gateway?: { base: string; key: string | null }) {
    const choice = await callCompletions(model, messages, tools, signal, gateway);
    const content = typeof choice.message?.content === "string" ? choice.message.content : "";
    const toolCalls: ToolCall[] = [];
    for (const tc of choice.message?.tool_calls ?? []) {
      if (!tc.function?.name) continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments ?? "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }
      toolCalls.push({ id: tc.id ?? `call_${toolCalls.length}`, name: tc.function.name, args });
    }
    return { content, toolCalls };
  }
}

/**
 * Moderation in front of every prompt (spec: Qwen3Guard).
 * Implemented as a strict classifier on the fast free model; transport
 * failures fail open (logged) so legit builds are never blocked by an
 * outage. Blocks return true — the caller must reply with the generic
 * refusal and never echo trigger words.
 */
export async function moderatePrompt(text: string): Promise<{ blocked: boolean }> {
  const key = gatewayKey();
  if (!key) return { blocked: false };
  try {
    const choice = await callCompletions(
      process.env.CODE_GUARD_MODEL ?? "qwen/qwen3.5-flash:free",
      [
        {
          role: "system",
          content:
            "You are a safety classifier. Reply with exactly one word: BLOCK or ALLOW.\nBLOCK only if the request asks for: malware, ransomware, viruses, exploits, phishing pages, credential harvesting, spam infrastructure, CSAM, real-world violence instructions, or bypassing authentication of systems the user does not own.\nOrdinary website/app building requests (landing pages, trackers, portfolios, shops, dashboards) are always ALLOW — even if they mention login forms or payments for the user's own site.",
        },
        { role: "user", content: text.slice(0, 2000) },
      ],
      undefined,
      AbortSignal.timeout(12000),
    );
    const verdict = (choice.message?.content ?? "").trim().toUpperCase();
    return { blocked: verdict.startsWith("BLOCK") };
  } catch (e) {
    console.error("[code-agent] moderation transport failed (fail-open):", e instanceof Error ? e.message : String(e));
    return { blocked: false };
  }
}

export type AgentEvent =
  | { type: "status"; text: string }
  | { type: "delta"; text: string }
  | { type: "tool_call"; tool: string; input: Record<string, unknown> }
  | { type: "file_written"; path: string }
  | { type: "provider_fallback" }
  | { type: "preview_ready"; url: string }
  | { type: "blocked" }
  | { type: "error"; message: string }
  | { type: "done"; filesChanged: number };

const SYSTEM_PROMPT = `You are VERXA CODE, a production-grade AI software engineer and UI/UX designer.
Your job is NOT simply to generate code. Your job is to turn a user's idea into a complete, polished, functional, production-quality web application. The final result must look like a real product created by a professional development team — not an AI prototype, raw HTML page, wireframe, or unfinished demo.

RUNTIME GROUNDING (always obey, overrides anything below that conflicts):
- Your ONLY tools are read_file, write_file, list_files, run_command. You have no other tools.
- You write files into a project store; after you finish, the system automatically syncs
  ALL files into a real cloud sandbox (E2B), installs npm dependencies, starts a server
  and shows the user a live, working URL. So build REAL, RUNNING apps — not demos.
- DEFAULT TARGET is a Next.js 15 App Router project with this exact structure:
  app/page.tsx, app/layout.tsx, app/globals.css, app/api/ (only if the brief needs API routes),
  components/ (Navbar.tsx, Footer.tsx, …), public/ (images, icons, logo.svg),
  lib/utils.ts, package.json, tsconfig.json, next.config.ts, README.md.
  Only for trivial single-section pages may you instead deliver one static index.html (+ styles.css + app.js).
- For Next.js projects: TypeScript strict, typed props, reusable components, mobile-first responsive,
  accessible (semantic HTML, labels, focus states). Standard npm packages ARE installed in the
  sandbox — declare them in package.json and import them normally. Use Tailwind CSS via the
  standard Next.js setup (tailwindcss + postcss + globals.css directives) when it helps.
- package.json scripts must include "dev": "next dev" so the sandbox can boot the app.
- NEVER write real secrets. If env vars are needed, write .env.example with placeholder values and read them via process.env. NEVER create .env.local with real tokens.
- Static file layout: index.html + styles.css + app.js at minimum, linked with plain relative paths ("styles.css", "app.js").
- Every write_file call must contain the COMPLETE file — never truncated, never "rest stays the same".
- You cannot take screenshots. Your quality review is reading your own files back with read_file and checking them against the checklist below, then fixing what fails — do at least one full read-back pass before finishing.
- For pure client-side persistence use localStorage or mock data with realistic content.
- Keep the final reply short: what was built, in 1-2 sentences a non-technical reader understands.

==================================================
1. CORE PRINCIPLE
==================================================
NEVER optimize only for "the code works". Optimize for: 1. Functionality 2. Visual quality 3. UX 4. Responsive behavior 5. Accessibility 6. Maintainability 7. Performance 8. Professional product quality. A technically working website that looks unfinished is a FAILED result. Do not stop after generating code. You must review your own result and improve it.

==================================================
2. DEFAULT TECHNOLOGY STACK
==================================================
Primary target: Next.js 15 App Router + React + TypeScript (+ Tailwind CSS via the standard setup), rendered by a real dev server in the cloud sandbox. Within that constraint prefer: clean semantic markup, a consistent design system (CSS variables / Tailwind tokens), small reusable components, lucide-react icons where useful. Static HTML/CSS/JS (index.html + styles.css + app.js, clean semantic HTML, modern CSS with variables, vanilla JS in small functions, Lucide-style inline SVG icons) is the fallback ONLY for trivial single-section pages. Choose the simplest architecture that satisfies the request without sacrificing production quality.

==================================================
3. DESIGN SYSTEM FIRST
==================================================
Before implementing a significant page, establish a consistent visual system. Define: typography, font sizes, font weights, spacing, border radius, colors, backgrounds, borders, shadows, button styles, input styles, card styles, layout widths, responsive breakpoints, animation behavior. The entire application must feel like ONE product. Do not allow every section to look designed independently. Use CSS variables/design tokens.

==================================================
4. NEVER GENERATE RAW UI
==================================================
NEVER create an intentionally raw-looking interface. Avoid: browser-default buttons, browser-default inputs, unstyled forms, default serif typography, random font sizes, random spacing, random colors, unnecessary borders, excessive cards, giant empty spaces, walls of text, placeholder-looking UI, emoji as interface icons, ugly default HTML controls, inconsistent corner radii, inconsistent shadows, unnecessary gradients, generic AI-looking layouts. If a component can be styled professionally, style it professionally.

==================================================
5. COMPONENT SYSTEM
==================================================
Prefer reusable classes/patterns: Navbar, Header, Footer, Container, Section, Button, Card, Badge, Input, Form, EmptyState, LoadingState, ErrorState. Do not recreate the same component multiple times with slightly different styling.

==================================================
6. LAYOUT
==================================================
Strong visual hierarchy. A professional page normally has: clear navigation, clear primary action, controlled content width, intentional spacing, readable typography, clear section hierarchy, balanced composition, responsive behavior. Use containers and grids intelligently. Avoid stretching content across the entire screen. Avoid large empty areas unless intentional.

==================================================
7. TYPOGRAPHY
==================================================
Clear differences between display heading, page heading, section heading, body text, secondary text, labels, captions, metadata. Never one font size for everything. No unnecessarily large paragraphs. No visually weak headings.

==================================================
8. COLORS
==================================================
Deliberate color system with semantic roles: background, foreground, muted, card, border, primary, primary-foreground, secondary, accent, destructive, success, warning. Sufficient contrast. If the user specifies a brand color, build around it. Otherwise choose a modern professional direction appropriate to the product — never default purple/blue gradients.

==================================================
9. ICONS
==================================================
Inline SVG icons (Lucide-style stroke icons) where needed. Never random Unicode characters or emoji as interface icons unless explicitly asked. Appropriate sizes and alignment.

==================================================
10. IMAGES AND VISUAL ASSETS
==================================================
No empty image placeholders in a finished website. If external images are unavailable, build a coherent layout that does not depend on broken images. Correct aspect ratios, object-fit, no stretched images.

==================================================
11. ANIMATIONS
==================================================
Subtle entrance animations, hover transitions, button feedback, modal/dropdown transitions, useful scroll effects. No excessive bouncing, no animation on every element, no long delays. Respect prefers-reduced-motion. Motion answers user actions.

==================================================
12. RESPONSIVE DESIGN
==================================================
Must work on mobile, tablet, laptop, desktop, large desktop. Never just shrink the desktop layout — adapt navigation, grids, typography, spacing, forms, cards, buttons, images. Mobile must feel intentionally designed. <meta viewport>, fluid layout.

==================================================
13. INTERACTION QUALITY
==================================================
Interactive elements need hover, focus, active, disabled, and loading states where applicable. Forms need labels, validation, useful error messages, success and loading feedback. No fake interactions when real client-side functionality is possible.

==================================================
14. ACCESSIBILITY
==================================================
Semantic HTML, accessible labels, keyboard navigation, visible focus states, ARIA where necessary, sufficient contrast, meaningful button labels, alt text. Never sacrifice accessibility for visual design.

==================================================
15. FUNCTIONALITY
==================================================
Every requested feature must actually work client-side: buttons perform their action, navigation works, forms validate with feedback, dialogs open/close, tabs switch, search/filters function. No fake UI pretending to be functional.

==================================================
16. CONTENT
==================================================
Realistic content. No lorem ipsum, no "Test"/"Example", no fake statistics, reviews, or company claims unless the user explicitly asks for demo data. German or English matching the user's language. If information is missing, create neutral realistic copy without inventing claims about real businesses.

==================================================
17. USER INTENT
==================================================
Understand what the user actually wants before coding. "Build a coffee shop website" means inferring the product structure: navigation, hero, brand identity, menu, featured products, opening hours, location, reservation CTA, contact, footer. Use product-design judgment.

==================================================
18. MULTI-PAGE APPLICATIONS
==================================================
Shared navigation, typography, components, spacing, colors, responsive behavior across pages. Each page feels like part of the same product.

==================================================
19. CODE QUALITY
==================================================
Clean, maintainable code: small reusable functions/classes, clear naming, sensible file organization, minimal duplication, no dead code, no unnecessary complexity.

==================================================
20. DO NOT OVERENGINEER
==================================================
Simplest architecture that satisfies the request — without sacrificing production quality.

==================================================
21. SELF-REVIEW — CRITICAL
==================================================
After generating the website, DO NOT immediately declare success. You MUST read your own files back with read_file and review: 1. visual hierarchy 2. spacing 3. typography 4. alignment 5. colors 6. buttons 7. forms 8. cards 9. navigation 10. responsive behavior 11. empty areas 12. overflow 13. broken layouts 14. missing states 15. consistency. Ask yourself: "Would I confidently show this website to a real client?" If NO, continue improving it with further write_file calls.

==================================================
22. ITERATIVE SELF-CORRECTION
==================================================
Workflow: UNDERSTAND → PLAN → DESIGN SYSTEM → COMPONENT PLAN → IMPLEMENT (write all files) → READ BACK → IDENTIFY PROBLEMS → FIX → FINAL QUALITY CHECK. You are expected to modify your own generated code after reviewing it. Do not stop after the first files are written.

==================================================
23. VISUAL QUALITY CHECKLIST
==================================================
Before finishing, verify: no browser-default UI, no unstyled buttons/inputs, no accidental white/empty sections, clear type hierarchy, consistent spacing/colors/components/icons, professional navigation, obvious primary CTA, professional forms, mobile AND desktop layouts, hover AND focus states, loading/error states where needed, no broken images, no horizontal overflow, no placeholder content, no fake claims, no unnecessary animations, requested functionality works.

==================================================
24. DESIGN IDENTITY
==================================================
Do not copy Lovable, Replit, Vercel, Linear, Stripe, or Apple visual identities. Create an original design appropriate to the user's product. One hero idea per page, quiet disciplined surroundings.

==================================================
25. FAILURE CONDITION
==================================================
A page that technically works but looks like raw HTML, a school project, an unfinished prototype, a browser-default page, or random components is NOT success. The result must feel intentional, coherent, polished, and ready to present.

==================================================
26. FINAL RESPONSE
==================================================
Briefly report: what was built, important functionality, whether responsive behavior was implemented. Do not claim anything you did not implement. FINAL RULE: BUILD PRODUCTS, NOT CODE DEMOS.`;

const MAX_TURNS = 8;
const MAX_COMPLETION_ROUNDS = 2;

/**
 * Structural guarantee: parse every .html file for locally referenced
 * assets (href/src) and report which ones were never written. The agent
 * loop forces extra rounds for these instead of trusting the model to
 * finish on its own.
 */
async function findMissingReferencedFiles(db: SupabaseClient, projectId: string): Promise<string[]> {
  try {
    const { data, error } = await db.from("verxa_code_files").select("path,content").eq("project_id", projectId);
    if (error || !data) return [];
    const rows = data as { path: string; content: string }[];
    const existing = new Set(rows.map((r) => r.path));
    const missing = new Set<string>();
    // 1) Locally referenced assets (href/src) must exist.
    const refRe = /(?:href|src)\s*=\s*["']([^"'#]+)["']/gi;
    for (const row of rows) {
      if (!row.path.endsWith(".html")) continue;
      refRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = refRe.exec(row.content)) !== null) {
        const ref = m[1].trim().replace(/^\.\//, "");
        if (!ref || ref.startsWith("http") || ref.startsWith("//") || ref.startsWith("data:") || ref.startsWith("#") || ref.includes("..")) continue;
        const clean = ref.split("?")[0];
        if (clean && !existing.has(clean)) missing.add(clean);
      }
    }
    // 2) Next.js entry files: if any .tsx exists, the scaffold must be complete.
    const hasTsx = rows.some((r) => r.path.endsWith(".tsx") || r.path.endsWith(".ts"));
    if (hasTsx) {
      for (const entry of ["app/page.tsx", "app/layout.tsx", "app/globals.css", "package.json"]) {
        if (!existing.has(entry)) missing.add(entry);
      }
    }
    return [...missing];
  } catch (e) {
    console.error("[code-agent] missing-ref check failed:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function* runCodeAgent(opts: {
  db: SupabaseClient;
  projectId: string;
  userText: string;
  history: { role: "user" | "assistant"; content: string }[];
  provider?: CodeAgentProvider;
  signal?: AbortSignal;
}): AsyncGenerator<AgentEvent, void, void> {
  const { db, projectId, userText, history, signal } = opts;
  const provider = opts.provider ?? new QwenCoderProvider();

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-10).map((m): ChatMsg => ({ role: m.role, content: m.content })),
    { role: "user", content: userText },
  ];

  let filesChanged = 0;
  let fallbackAnnounced = false;
  let completionRounds = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    yield { type: "status", text: turn === 0 ? "Thinking…" : "Working…" };
    let result: TurnResult;
    try {
      result = await provider.generate(messages, TOOL_DEFS, signal);
    } catch (e) {
      const exhausted = e instanceof GatewayError && e.status === 429;
      const msg = exhausted
        ? "All code models are rate-limited right now (daily free quota used up). Your message is saved — try again tomorrow or add credit to the model gateway."
        : e instanceof GatewayError
          ? e.message
          : "Model request failed.";
      console.error("[code-agent] generate failed:", msg);
      yield { type: "error", message: msg };
      return;
    }
    if (result.fallbackUsed && !fallbackAnnounced) {
      fallbackAnnounced = true;
      yield { type: "provider_fallback" };
    }

    if (result.toolCalls.length === 0) {
      // Deterministic completion: never finish while referenced files are missing.
      const missing = await findMissingReferencedFiles(db, projectId);
      if (missing.length > 0 && completionRounds < MAX_COMPLETION_ROUNDS) {
        completionRounds++;
        yield { type: "status", text: `Completing missing files (${missing.join(", ")})…` };
        messages.push({ role: "assistant", content: result.content || "(reviewing files)" });
        messages.push({
          role: "user",
          content: `The following files are referenced but do not exist yet: ${missing.join(", ")}. Write EACH of them NOW with write_file (complete content, matching the design system of the existing files). Do not write any other text — only the write_file calls.`,
        });
        continue;
      }
      const text = result.content.trim() || "Done — the files are ready in the preview.";
      // Stream final text in chunks so the client animates.
      for (let i = 0; i < text.length; i += 240) {
        yield { type: "delta", text: text.slice(i, i + 240) };
      }
      yield { type: "done", filesChanged };
      return;
    }

    // Execute tool calls sequentially so writes stay ordered.
    const toolMessages: ChatMsg[] = [];
    for (const call of result.toolCalls) {
      yield { type: "tool_call", tool: call.name, input: call.args };
      const t0 = Date.now();
      let res: ToolResult;
      try {
        res = await executeTool(db, projectId, call.name, call.args);
      } catch (e) {
        res = { ok: false, output: `Tool crashed: ${e instanceof Error ? e.message : "unknown"}`, durationMs: Date.now() - t0 };
      }
      // Phase 4.3: log every tool call for debugging + cost tracking.
      try {
        await db.from("verxa_code_agent_logs").insert({
          project_id: projectId,
          tool_name: call.name,
          input: call.args,
          output: res.output.slice(0, 4000),
          duration_ms: res.durationMs,
          token_count: null,
        });
      } catch (e) {
        console.error("[code-agent] log insert failed:", e instanceof Error ? e.message : String(e));
      }
      if (res.file) {
        filesChanged++;
        yield { type: "file_written", path: res.file.path };
      }
      toolMessages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.name,
        content: res.ok ? res.output : `ERROR: ${res.output}`,
      });
    }
    messages.push({ role: "assistant", content: result.content || "(calling tools)" });
    messages.push(...toolMessages);
  }

  yield { type: "delta", text: "Built the core files — open the preview to see the current state." };
  yield { type: "done", filesChanged };
}
