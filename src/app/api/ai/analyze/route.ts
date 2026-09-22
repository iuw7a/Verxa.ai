import { NextRequest } from "next/server";
import { buildImageAnalysisPrompt } from "@/lib/ai/system";
import { completeAi, isImageDataUrl } from "@/lib/ai/xkiro-server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST { image: dataURL, note?: string }
 * Real vision analysis through the XKiro gateway (never faked).
 * 413/415-style failures are reported honestly to the client.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    image?: string;
    note?: string;
  } | null;

  const image = body?.image ?? "";
  if (!isImageDataUrl(image)) {
    return new Response(
      JSON.stringify({
        error:
          "No valid image received. Send a JPEG/PNG/WebP photo as a data URL.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  // ~6MB data-URL cap keeps the upstream request within limits.
  if (image.length > 8_000_000) {
    return new Response(
      JSON.stringify({
        error:
          "This image is too large to analyze. Please use a smaller photo (under ~6 MB).",
      }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const { text, model } = await completeAi(
      [
        {
          role: "user",
          content: [
            { type: "text", text: buildImageAnalysisPrompt(body?.note) },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
      { maxTokens: 2048, temperature: 0.4, signal: req.signal },
    );
    return new Response(JSON.stringify({ analysis: text, model }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "[ai/analyze]",
      error instanceof Error ? error.message : error,
    );
    const msg = error instanceof Error ? error.message : "";
    const unsupported =
      /vision|image|invalid|unsupported|422/i.test(msg) && !/failed \(.*→/i.test(msg);
    return new Response(
      JSON.stringify({
        error: unsupported
          ? "The current AI model cannot analyze images. Your photo was not processed — please try again later or describe it in the chat."
          : "Image analysis failed. Your photo was not processed — please try again.",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
