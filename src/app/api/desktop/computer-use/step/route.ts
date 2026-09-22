import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";
import { resolveDesktopUser } from "@/lib/desktop";
import { checkRateLimit } from "@/lib/email/rate-limit";
import {
  COMPUTER_USE_SYSTEM_PROMPT,
  extractComputerActionJson,
  validateComputerAction,
  type ClientAction,
} from "@/lib/computer-use";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Computer Use reasoning endpoint. The desktop sends: goal + screenshot +
 * context. The server (which owns all provider keys) reasons with a vision
 * model and returns ONE validated action. The desktop enforces its own
 * policy layer on top (permissions, safe mode, confirmations, stop).
 */

/** Server-side consent/capability gate for the decided action. */
function allowedByConsent(
  action: { type: string },
  consent: { screen_access: boolean; mouse_control: boolean; keyboard_control: boolean; app_control: boolean },
): boolean {
  switch (action.type) {
    case "screenshot":
      return consent.screen_access;
    case "move_mouse": case "click": case "double_click": case "right_click":
    case "drag": case "scroll":
      return consent.mouse_control;
    case "type": case "key_press": case "hotkey":
      return consent.keyboard_control;
    case "open_application": case "focus_window": case "close_window":
      return consent.app_control;
    default:
      return true; // wait/done/ask_user need no capability
  }
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

export async function POST(req: NextRequest) {
  const ctx = await resolveDesktopUser(req);
  if (!ctx) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Service not configured." }, { status: 500 });
  }

  // Server is the authority on consent — the client can never self-grant.
  const { data: consentRow } = await admin
    .from("verxa_desktop_computer_use")
    .select("enabled,screen_access,mouse_control,keyboard_control,app_control")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  const consent = (consentRow ?? null) as {
    enabled: boolean; screen_access: boolean; mouse_control: boolean;
    keyboard_control: boolean; app_control: boolean;
  } | null;
  if (!consent?.enabled) {
    return NextResponse.json(
      { error: "Computer Use is not enabled for this account." },
      { status: 403 },
    );
  }

  const rl = await checkRateLimit(`cu-step:${ctx.userId}`, 60, 3600 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit reached." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    goal?: string;
    screenshot?: string;
    screen?: { w?: number; h?: number };
    active_window?: { title?: string };
    history?: { action?: string; observation?: string }[];
    step?: number;
  } | null;

  const goal = (body?.goal ?? "").trim().slice(0, 500);
  const screenshot = body?.screenshot ?? "";
  if (!goal) {
    return NextResponse.json({ error: "goal required." }, { status: 400 });
  }
  if (
    typeof screenshot !== "string" ||
    screenshot.length < 1000 ||
    screenshot.length > 700_000 ||
    !screenshot.startsWith("data:image/")
  ) {
    return NextResponse.json({ error: "Valid screenshot required." }, { status: 400 });
  }

  const history = Array.isArray(body?.history)
    ? (body?.history ?? []).slice(-12).map((h) => ({
        action: String(h.action ?? "").slice(0, 300),
        observation: String(h.observation ?? "").slice(0, 300),
      }))
    : [];
  const screen = {
    w: Math.min(8000, Math.max(1, Math.floor(body?.screen?.w ?? 0) || 0)),
    h: Math.min(8000, Math.max(1, Math.floor(body?.screen?.h ?? 0) || 0)),
  };
  const activeWindow = (body?.active_window?.title ?? "").slice(0, 200);
  const step = Math.min(100, Math.max(1, Math.floor(body?.step ?? 1)));

  const userContent =
    `Goal: ${goal}\nStep: ${step}\nScreen pixels: ${screen.w}x${screen.h} (model coords 0-1000 relative)\n` +
    `Active window: ${activeWindow || "(unknown)"}\n` +
    (history.length
      ? `History (latest last):\n${history.map((h, i) => `${i + 1}. ${h.action}${h.observation ? ` → ${h.observation}` : ""}`).join("\n")}\n`
      : "History: (none — first step)\n") +
    "Decide the single next action:";

  // Vision-capable models, best first. Keys stay on this server.
  const candidates: { base: string; key: string; model: string }[] = [];
  if (process.env.NVIDIA_API_KEY?.trim()) {
    candidates.push({
      base: normalizeBaseUrl(process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1"),
      key: process.env.NVIDIA_API_KEY.trim(),
      model: "meta/llama-3.2-11b-vision-instruct",
    });
  }
  if (process.env.XKIRO_API_KEY?.trim()) {
    candidates.push({
      base: normalizeBaseUrl(process.env.XKIRO_BASE_URL ?? "https://api.xkiro.com/v1"),
      key: process.env.XKIRO_API_KEY.trim(),
      model: "mistralai/mistral-small-2603",
    });
  }
  if (!candidates.length) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 500 });
  }

  let action: (ClientAction & { needs_confirmation: boolean }) | null = null;
  let lastError = "";
  for (const c of candidates) {
    try {
      const res = await fetch(`${c.base}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: c.model,
          messages: [
            { role: "system", content: COMPUTER_USE_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: userContent },
                { type: "image_url", image_url: { url: screenshot } },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 512,
          stream: false,
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const json = (await res.json().catch(() => null)) as {
        choices?: { message?: { content?: string } }[];
      } | null;
      const text = json?.choices?.[0]?.message?.content ?? "";
      const parsed = extractComputerActionJson(text);
      const valid = validateComputerAction(parsed);
      if (!valid) {
        lastError = "invalid action JSON";
        continue;
      }
      action = valid;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!action) {
    return NextResponse.json(
      { error: "The model did not return a valid action.", detail: lastError },
      { status: 502 },
    );
  }

  if (!allowedByConsent(action, consent)) {
    return NextResponse.json(
      { error: `Action '${action.type}' is disabled in Computer Use settings.` },
      { status: 403 },
    );
  }

  return NextResponse.json({ action });
}
