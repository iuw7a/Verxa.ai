import "server-only";

/**
 * Agnes AI generation gateway (apihub.agnes-ai.com) — server-side only.
 *
 * Verified against the live API (wiki.agnes-ai.com docs + real requests):
 * - Image: POST /v1/images/generations  → sync, returns a hosted URL (~10s)
 * - Video: POST /v1/videos              → async task { video_id }
 *          GET  /agnesapi?video_id=…    → { status, url } when completed
 * AGNES_API_KEY is read from the environment, never shipped to the client.
 */

const AGNES_BASE = process.env.AGNES_BASE_URL ?? "https://apihub.agnes-ai.com";
export const AGNES_IMAGE_MODEL = process.env.AGNES_IMAGE_MODEL ?? "agnes-image-2.1-flash";
export const AGNES_VIDEO_MODEL = process.env.AGNES_VIDEO_MODEL ?? "agnes-video-v2.0";
export const AGNES_VIDEO_MODEL_25 = "agnes-video-2.5-flash"; // limited-time free, 720P fixed

/** User-selectable video options (composer panel). Values validated server-side. */
export type AgnesVideoOptions = {
  model?: string; // AGNES_VIDEO_MODEL_25 (default) | AGNES_VIDEO_MODEL
  seconds?: number; // 4 | 5 | 6 | 8 | 10 | 12
  aspectRatio?: string; // 21:9 | 16:9 | 4:3 | 1:1 | 3:4 | 9:16
};

const ASPECT_DIMS: Record<string, [number, number]> = {
  "21:9": [1680, 720],
  "16:9": [1280, 704], // verified 720P 16:9 output size
  "4:3": [960, 720],
  "1:1": [720, 720],
  "3:4": [720, 960],
  "9:16": [720, 1280],
};

/** Whitelist validation — anything outside the documented matrix is coerced. */
export function normalizeVideoOptions(opts: AgnesVideoOptions | undefined | null): {
  model: string;
  seconds: number;
  aspectRatio: string;
} {
  const model = opts?.model === AGNES_VIDEO_MODEL ? AGNES_VIDEO_MODEL : AGNES_VIDEO_MODEL_25;
  const allowedSeconds = [4, 5, 6, 8, 10, 12];
  const seconds = allowedSeconds.includes(opts?.seconds ?? 5) ? (opts?.seconds as number) : 5;
  const aspectRatio = opts?.aspectRatio && ASPECT_DIMS[opts.aspectRatio] ? opts.aspectRatio : "16:9";
  return { model, seconds, aspectRatio };
}

export function isAgnesConfigured(): boolean {
  return Boolean(process.env.AGNES_API_KEY);
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.AGNES_API_KEY}`,
    "Content-Type": "application/json",
  };
}

function mapError(status: number, text: string): { code: string; message: string } {
  const lower = (text || "").toLowerCase();
  if (status === 401 || status === 403)
    return { code: "auth", message: "Generation provider rejected the request (auth). Media generation is paused." };
  if (status === 429 || lower.includes("rate limit"))
    return { code: "rate_limit", message: "Generation rate limit reached. Wait a moment and try again." };
  if (status === 402 || lower.includes("balance") || lower.includes("credit"))
    return { code: "credits", message: "The generation provider is out of credits — media generation is paused." };
  if (status >= 500)
    return { code: "provider", message: "The generation service had a hiccup. Please try again." };
  // Surface the provider's own validation message cleanly (JSON or plain).
  let detail: string | null = null;
  try {
    const j = JSON.parse(text || "{}") as {
      error?: { message?: string } | string;
      detail?: string;
      message?: string;
    };
    detail =
      (typeof j.error === "string" ? j.error : j.error?.message) ??
      j.detail ??
      j.message ??
      null;
  } catch {
    detail = text ? text.slice(0, 160) : null;
  }
  return {
    code: "unknown",
    message: detail
      ? `Generation failed: ${detail}`
      : "Generation failed. Please try again.",
  };
}

function validatePrompt(prompt: string): { code: string; message: string } | null {
  const t = prompt.trim();
  if (t.length < 3 || t.length > 2000)
    return { code: "invalid_prompt", message: "Describe what to generate in a few words (3–2000 characters)." };
  return null;
}

// ---------------------------------------------------------------------------
// IMAGE — synchronous, returns a hosted URL (verified ~10s end-to-end)
// ---------------------------------------------------------------------------

export type AgnesImageResult =
  | { ok: true; url: string }
  | { ok: false; code: string; message: string };

export async function agnesGenerateImage(prompt: string): Promise<AgnesImageResult> {
  if (!isAgnesConfigured())
    return { ok: false, code: "not_configured", message: "Image generation is not configured." };
  const invalid = validatePrompt(prompt);
  if (invalid) return { ok: false, ...invalid };

  // One retry for transient failures (timeouts, 5xx, 429) — the provider
  // occasionally stalls a request; a fresh POST usually returns in ~10s and
  // beats making the user watch a spinner die at 2 minutes.
  const attempt = async (timeoutMs: number): Promise<AgnesImageResult> => {
    try {
      const t0 = Date.now();
      const res = await fetch(`${AGNES_BASE}/v1/images/generations`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          model: AGNES_IMAGE_MODEL,
          prompt: prompt.trim(),
          size: "1K",
          ratio: "16:9",
          extra_body: { response_format: "url" },
        }),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
      const text = await res.text().catch(() => "");
      console.log(`[agnes] image status=${res.status} duration=${Date.now() - t0}ms`);
      if (!res.ok) {
        const mapped = mapError(res.status, text);
        return { ok: false, ...mapped };
      }
      const json = JSON.parse(text || "{}") as { data?: { url?: string; b64_json?: string }[] };
      const url = json.data?.[0]?.url ?? null;
      if (!url) return { ok: false, code: "empty", message: "The model returned no image. Try a different prompt." };
      return { ok: true, url };
    } catch {
      return { ok: false, code: "network", message: "Could not reach the image service. Please try again." };
    }
  };

  const transient = (r: AgnesImageResult) =>
    r.ok === false && (r.code === "network" || r.code === "provider" || r.code === "rate_limit");

  // First attempt is capped well under the route's maxDuration (120s) so a
  // retry can still fit inside the same request. Second attempt gets the rest.
  const first = await attempt(70_000);
  if (first.ok || !transient(first)) return first;
  console.warn(`[agnes] image transient failure (${first.code}) — retrying once`);
  return attempt(45_000);
}

// ---------------------------------------------------------------------------
// VIDEO — async task API
// ---------------------------------------------------------------------------

export type AgnesVideoSubmit =
  | { ok: true; videoId: string }
  | { ok: false; code: string; message: string };

export async function agnesSubmitVideo(
  prompt: string,
  options?: AgnesVideoOptions | null,
): Promise<AgnesVideoSubmit & { model: string }> {
  if (!isAgnesConfigured())
    return { ok: false, code: "not_configured", message: "Video generation is not configured.", model: AGNES_VIDEO_MODEL_25 };
  const invalid = validatePrompt(prompt);
  if (invalid) return { ok: false, ...invalid, model: AGNES_VIDEO_MODEL_25 };

  const { model, seconds, aspectRatio } = normalizeVideoOptions(options);

  // Request bodies per model family (verified contracts from the Agnes docs):
  //  - 2.5-flash: mode/size/aspect_ratio/seconds-as-string (720P fixed, free)
  //  - v2.0: width/height/num_frames (8n+1 frames at 24fps)
  const params25 = {
    model,
    prompt: prompt.trim(),
    mode: "text",
    size: "720P",
    aspect_ratio: aspectRatio,
    seconds: String(seconds),
  };
  const [w, h] = ASPECT_DIMS[aspectRatio];
  const frames = Math.round(seconds * 24 / 8) * 8 + 1; // 8n+1 rule
  const params20 = {
    model,
    prompt: prompt.trim(),
    width: w,
    height: h,
    num_frames: frames,
    frame_rate: 24,
    seconds: String(seconds), // v2.0 validation now demands it too
  };

  try {
    const res = await fetch(`${AGNES_BASE}/v1/videos`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(model === AGNES_VIDEO_MODEL_25 ? params25 : params20),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const mapped = mapError(res.status, text);
      return { ok: false, ...mapped, model };
    }
    const json = JSON.parse(text || "{}") as { video_id?: string; id?: string };
    const videoId = json.video_id ?? json.id ?? null;
    if (!videoId) return { ok: false, code: "provider", message: "Video task could not be created. Please try again.", model };
    return { ok: true, videoId, model };
  } catch {
    return { ok: false, code: "network", message: "Could not reach the video service. Please try again.", model };
  }
}

export type AgnesVideoStatus =
  | { state: "running"; progress: number | null }
  | { state: "done"; url: string }
  | { state: "error"; message: string };

export async function agnesVideoStatus(videoId: string, modelName?: string): Promise<AgnesVideoStatus> {
  try {
    // model_name is required for 2.5-flash retrieval in non-text modes and
    // recommended everywhere (docs: integration checklist).
    const modelQ = modelName ? `&model_name=${encodeURIComponent(modelName)}` : "";
    const res = await fetch(`${AGNES_BASE}/agnesapi?video_id=${encodeURIComponent(videoId)}${modelQ}`, {
      headers: headers(),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
    if (!res.ok) return { state: "running", progress: null }; // transient — keep polling
    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      internal_status?: string;
      progress?: number;
      error?: string | { message?: string } | null;
      url?: string;
      output?: { url?: string } | null;
    };
    const done = json.status === "completed" || json.internal_status === "completed";
    if (done && json.url) return { state: "done", url: json.url };
    const failed = json.status === "failed" || json.internal_status === "failed";
    if (failed) {
      const msg = typeof json.error === "string" ? json.error : (json.error?.message ?? undefined);
      return { state: "error", message: msg ?? "The video generation failed. Please try again." };
    }
    return { state: "running", progress: typeof json.progress === "number" ? json.progress : null };
  } catch {
    return { state: "running", progress: null }; // transient — keep polling
  }
}
