import "server-only";

/**
 * fal.ai generation service (image + video) — server-side only.
 *
 * - FAL_KEY is read from the environment, never shipped to the client.
 * - Uses fal's queue API so long-running video generation never blocks a
 *   serverless request: submit → poll status → fetch result.
 * - Models are configurable via IMAGE_MODEL / VIDEO_MODEL env vars.
 */

const FAL_QUEUE = "https://queue.fal.run";

export type FalKind = "image" | "video";

export const IMAGE_MODEL = process.env.IMAGE_MODEL ?? "fal-ai/flux/schnell";
export const VIDEO_MODEL = process.env.VIDEO_MODEL ?? "fal-ai/ltx-video";

export function isFalConfigured(): boolean {
  return Boolean(process.env.FAL_KEY);
}

export type FalSubmitResult =
  | { ok: true; requestId: string; statusUrl: string; responseUrl: string }
  | { ok: false; code: string; message: string };

export type FalStatusPayload = {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  queuePosition?: number;
  logs?: { message?: string }[];
};

export type FalResultPayload = {
  // Image endpoints return { images: [{ url, width, height }] } (or a single image).
  images?: { url: string; width?: number; height?: number }[];
  image?: { url: string; width?: number; height?: number };
  // Video endpoints return { video: { url } }.
  video?: { url: string };
  videos?: { url: string }[];
};

function authHeaders(): HeadersInit {
  return {
    Authorization: `Key ${process.env.FAL_KEY}`,
    "Content-Type": "application/json",
  };
}

/** Map fal/provider failures to clean, user-facing messages (no secrets). */
function mapError(status: number, text: string): { code: string; message: string } {
  const lower = (text || "").toLowerCase();
  // fal locks exhausted accounts with HTTP 403 + a billing reason.
  if (lower.includes("exhausted balance") || lower.includes("top up your balance") || status === 402)
    return { code: "credits", message: "The generation provider account is out of credits — media generation is paused until the balance is topped up." };
  if (status === 401 || status === 403)
    return { code: "auth", message: "Media generation is temporarily unavailable (provider auth). Please try again later." };
  if (status === 422)
    return { code: "invalid_prompt", message: "That prompt was rejected by the model. Try rephrasing it." };
  if (status === 429)
    return { code: "rate_limit", message: "Generation rate limit reached. Wait a moment and try again." };
  if (status === 402)
    return { code: "credits", message: "The generation provider is out of credits. Media generation is paused." };
  if (status >= 500)
    return { code: "provider", message: "The generation service had a hiccup. Please try again." };
  return {
    code: "unknown",
    message: text?.slice(0, 140)
      ? `Generation failed (provider said: ${text.slice(0, 140)}).`
      : "Generation failed. Please try again.",
  };
}

// ---------------------------------------------------------------------------
// Barada Studio — image edit / transform + image-to-video (fal queue)
// ---------------------------------------------------------------------------

export const IMAGE_EDIT_MODEL =
  process.env.FAL_IMAGE_EDIT_MODEL ?? "fal-ai/flux-pro/kontext";
export const IMAGE_TO_VIDEO_MODEL =
  process.env.FAL_IMAGE_TO_VIDEO_MODEL ?? "fal-ai/kling-video/v1.6/standard/image-to-video";

/**
 * Submit an instruction-based image edit (FLUX Kontext).
 * `imageUrl` must be publicly reachable — pass an absolute /api/media/… URL
 * or any hosted image URL.
 */
export async function falSubmitImageEdit(
  imageUrl: string,
  prompt: string,
): Promise<FalSubmitResult> {
  if (!isFalConfigured())
    return { ok: false, code: "not_configured", message: "Image editing is not configured on this server." };
  const trimmed = prompt.trim();
  if (trimmed.length < 3 || trimmed.length > 1000)
    return { ok: false, code: "invalid_prompt", message: "Describe the edit in a few words (3–1000 characters)." };

  try {
    const res = await fetch(`${FAL_QUEUE}/${IMAGE_EDIT_MODEL}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ prompt: trimmed, image_url: imageUrl }),
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const mapped = mapError(res.status, text);
      return { ok: false, ...mapped };
    }
    const json = JSON.parse(text || "{}") as {
      request_id?: string;
      status_url?: string;
      response_url?: string;
    };
    if (!json.request_id || !json.status_url || !json.response_url)
      return { ok: false, code: "provider", message: "The editing service returned an unexpected response. Please try again." };
    return { ok: true, requestId: json.request_id, statusUrl: json.status_url, responseUrl: json.response_url };
  } catch {
    return { ok: false, code: "network", message: "Could not reach the editing service. Please try again." };
  }
}

/**
 * Submit an image-to-video job (Kling). `prompt` is optional motion
 * direction; an empty prompt lets the model decide the motion.
 */
export async function falSubmitImageToVideo(
  imageUrl: string,
  prompt: string,
): Promise<FalSubmitResult> {
  if (!isFalConfigured())
    return { ok: false, code: "not_configured", message: "Image-to-video is not configured on this server." };
  const trimmed = prompt.trim();
  if (trimmed.length > 1000)
    return { ok: false, code: "invalid_prompt", message: "Keep the motion prompt under 1000 characters." };

  const payload: Record<string, unknown> = { image_url: imageUrl };
  if (trimmed) payload.prompt = trimmed;

  try {
    const res = await fetch(`${FAL_QUEUE}/${IMAGE_TO_VIDEO_MODEL}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const mapped = mapError(res.status, text);
      return { ok: false, ...mapped };
    }
    const json = JSON.parse(text || "{}") as {
      request_id?: string;
      status_url?: string;
      response_url?: string;
    };
    if (!json.request_id || !json.status_url || !json.response_url)
      return { ok: false, code: "provider", message: "The video service returned an unexpected response. Please try again." };
    return { ok: true, requestId: json.request_id, statusUrl: json.status_url, responseUrl: json.response_url };
  } catch {
    return { ok: false, code: "network", message: "Could not reach the video service. Please try again." };
  }
}

/** Submit a generation job to fal's queue. */
export async function falSubmit(
  kind: FalKind,
  prompt: string,
): Promise<FalSubmitResult> {
  if (!isFalConfigured())
    return { ok: false, code: "not_configured", message: "Media generation is not configured on this server." };
  const trimmed = prompt.trim();
  if (trimmed.length < 3 || trimmed.length > 2000)
    return { ok: false, code: "invalid_prompt", message: "Describe what to generate in a few words (3–2000 characters)." };

  const model = kind === "image" ? IMAGE_MODEL : VIDEO_MODEL;
  const payload =
    kind === "image"
      ? { prompt: trimmed, image_size: "landscape_16_9" }
      : { prompt: trimmed };

  try {
    const res = await fetch(`${FAL_QUEUE}/${model}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const mapped = mapError(res.status, text);
      return { ok: false, ...mapped };
    }
    const json = JSON.parse(text || "{}") as {
      request_id?: string;
      status_url?: string;
      response_url?: string;
    };
    if (!json.request_id || !json.status_url || !json.response_url)
      return { ok: false, code: "provider", message: "The generation service returned an unexpected response. Please try again." };
    return { ok: true, requestId: json.request_id, statusUrl: json.status_url, responseUrl: json.response_url };
  } catch {
    return { ok: false, code: "network", message: "Could not reach the generation service. Please try again." };
  }
}

/** Poll one job's status. */
export async function falStatus(statusUrl: string): Promise<FalStatusPayload | null> {
  try {
    const res = await fetch(statusUrl, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as FalStatusPayload;
  } catch {
    return null;
  }
}

/** Fetch the finished result and extract a single media URL. */
export async function falResult(
  responseUrl: string,
): Promise<{ ok: true; url: string; kind: FalKind } | { ok: false; code: string; message: string }> {
  try {
    const res = await fetch(responseUrl, { headers: authHeaders(), cache: "no-store" });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const mapped = mapError(res.status, text);
      return { ok: false, ...mapped };
    }
    const json = JSON.parse(text || "{}") as FalResultPayload;
    const url =
      json.images?.[0]?.url ??
      json.image?.url ??
      json.video?.url ??
      json.videos?.[0]?.url ??
      null;
    if (!url) return { ok: false, code: "empty", message: "The model returned no media. Please try a different prompt." };
    const kind: FalKind = json.video?.url || json.videos?.length ? "video" : "image";
    return { ok: true, url, kind };
  } catch {
    return { ok: false, code: "network", message: "Could not fetch the generated media. Please try again." };
  }
}
