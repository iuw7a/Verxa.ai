/**
 * Detects natural-language image/video generation intent in any mixed
 * language chat message (EN / DE / AR wordings). The explicit composer
 * toggles bypass this and force the mode.
 *
 * Rules learned the hard way:
 *  - Quoted segments (sign/caption text like display this text: "This video
 *    was created by Verxa AI") must NOT classify the message — strip them.
 *  - When both an image and a video keyword appear, the FIRST one in the
 *    text wins (previously video always won, hijacking image prompts that
 *    merely contained the word "video" somewhere).
 */
export type MediaIntent = "image" | "video";

function firstIndex(re: RegExp, s: string): number {
  const m = re.exec(s);
  return m ? m.index : Number.POSITIVE_INFINITY;
}

export function detectMediaIntent(text: string): MediaIntent | null {
  // Strip quoted segments (double-quote families: "…" “…” „…“ «…»).
  const cleaned = text.replace(/"[^"\n]*"|“[^”\n]*”|„[^“”\n]*“|«[^»\n]*»/g, " ");
  const q = cleaned.toLowerCase();

  const videoIdx = Math.min(
    firstIndex(/\b(video|clip|animation|animated|videoclip)\b/, q),
    firstIndex(/فيديو|مقطع/, cleaned),
  );
  const imageIdx = Math.min(
    firstIndex(
      /\b(image|photo|picture|bild|foto|poster|logo|artwork|illustration|drawing|render|painting|wallpaper|thumbnail|avatar)\b/,
      q,
    ),
    firstIndex(/صورة|صوره/, cleaned),
  );
  const genWord =
    /\b(generate|create|make|draw|design|render|produce|show me|erstelle|generiere|mach|zeichne|erstell|erzeuge)\b/.test(q) ||
    /انشئ|أنشئ|اصنع|اعمل|ولد|توليد/.test(cleaned);

  if (!genWord) return null;
  if (videoIdx !== Number.POSITIVE_INFINITY && imageIdx !== Number.POSITIVE_INFINITY)
    return videoIdx < imageIdx ? "video" : "image";
  if (videoIdx !== Number.POSITIVE_INFINITY) return "video";
  if (imageIdx !== Number.POSITIVE_INFINITY) return "image";
  return null;
}
