import { NextRequest } from "next/server";
import { xkiroApiKey, xkiroBaseUrl } from "@/lib/ai/config";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST multipart/form-data { audio: File }
 * Tries server-side transcription via the XKiro OpenAI-compatible
 * audio endpoint. If the gateway does not offer it, the client is told
 * honestly and falls back to on-device (Web Speech) transcription.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return new Response(JSON.stringify({ error: "No audio received." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (audio.size > 15_000_000) {
    return new Response(
      JSON.stringify({ error: "Audio is too long — keep recordings under ~2 minutes." }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  const key = xkiroApiKey();
  if (!key) {
    return new Response(
      JSON.stringify({ ok: false, unsupported: true, error: "Transcription is not configured." }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const out = new FormData();
    out.append("file", audio, audio.name || "recording.webm");
    out.append("model", "whisper-1");
    const res = await fetch(`${xkiroBaseUrl()}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: out,
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          unsupported: true,
          error: "Server transcription is unavailable — on-device transcription will be used.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    const json = (await res.json().catch(() => null)) as { text?: string } | null;
    const text = json?.text?.trim() ?? "";
    if (!text) {
      return new Response(
        JSON.stringify({ ok: false, error: "Nothing was transcribed — please try again." }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ ok: true, text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ai/transcribe]", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({
        ok: false,
        unsupported: true,
        error: "Server transcription failed — on-device transcription will be used.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
}
