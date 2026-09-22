"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ImageIcon, Play, RefreshCw, Video, X } from "lucide-react";
import type { MediaAttachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { VerxaMark } from "@/components/brand/verxa-mark";

/**
 * Branded generating skeleton: the Verxa mark inside a spinning accent ring,
 * over a shimmer, with a live elapsed-seconds counter and honest tiered wait
 * copy that stops promising "30–90 seconds" once that's no longer true.
 */
function MediaSkeleton({ kind, glass }: { kind: "image" | "video"; glass?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Tiered, honest copy per kind — never show an optimistic estimate that
  // has already been exceeded.
  const hint =
    kind === "image"
      ? elapsed < 45
        ? "Usually 10–30 seconds."
        : elapsed < 120
          ? "Taking longer than usual — still working on it."
          : "This is slower than it should be. You can keep waiting or send the prompt again."
      : elapsed < 90
        ? "This can take 1–3 minutes — quality takes time."
        : elapsed < 210
          ? "Still rendering — hang tight."
          : "Longer than expected. You can keep waiting or send the prompt again.";

  return (
    <div className={cn("max-w-[480px]", glass && "glass-btn rounded-2xl")}>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-line bg-white/[0.03]">
        <div className="shimmer absolute inset-0" />
        <div className="relative flex flex-col items-center gap-3.5">
          <span className="relative flex h-[72px] w-[72px] items-center justify-center">
            <span
              className="absolute inset-0 animate-spin rounded-full border-2 border-[var(--accent)]/15 border-t-[var(--accent)]/80"
              style={{ animationDuration: "1.6s" }}
            />
            <span className="glass flex items-center justify-center rounded-xl p-2 shadow-[0_0_22px_rgba(142,164,255,0.18)]">
              <VerxaMark size={36} />
            </span>
          </span>
          <p className="flex items-center gap-2 text-[13px] text-muted">
            Generating {kind}
            <span className="tabular-nums text-faint">· {elapsed}s</span>
          </p>
          <p className="text-center text-[11.5px] text-faint">{hint}</p>
        </div>
      </div>
    </div>
  );
}
export function MediaCard({ media, glass = false }: { media: MediaAttachment; glass?: boolean }) {
  const [lightbox, setLightbox] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Lightbox: Esc closes, body scroll locks.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  if (media.state === "error") {
    return (
      <div
        className={cn(
          "flex max-w-[480px] items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3.5",
          glass && "glass-btn",
        )}
      >
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-400" />
        <div>
          <p className="text-[13.5px] font-medium text-ink">
            {media.kind === "image" ? "Image" : "Video"} generation failed
            {media.videoOptions ? (
              <span className="ml-1.5 text-[10.5px] font-normal text-faint">
                ({media.videoOptions.model === "agnes-video-v2.0" ? "Video 2.0" : "Video 2.5 Flash"} · {media.videoOptions.seconds}s · {media.videoOptions.aspectRatio})
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{media.error}</p>
        </div>
      </div>
    );
  }

  if (media.state === "done" && !media.url) {
    // Final state without a URL would spin forever as a skeleton — surface it
    // as an error instead.
    return (
      <div
        className={cn(
          "flex max-w-[480px] items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3.5",
          glass && "glass-btn",
        )}
      >
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-400" />
        <div>
          <p className="text-[13.5px] font-medium text-ink">{media.kind === "image" ? "Image" : "Video"} generation finished, but no result was returned.</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">Send the prompt again to retry.</p>
        </div>
      </div>
    );
  }

  if (media.state === "generating" || !media.url) {
    return <MediaSkeleton kind={media.kind} glass={glass} />;
  }

  return (
    <div className="max-w-[480px]">
      {media.kind === "image" ? (
        <>
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className={cn(
              "animate-chip-pop relative block w-full overflow-hidden rounded-2xl border border-line transition hover:border-[var(--accent)]/40",
              glass && "glass-btn",
            )}
            title="Click to enlarge"
          >
            {!loaded && <div className="shimmer absolute inset-0 aspect-video" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media.url}
              alt={media.prompt || "Generated image"}
              onLoad={() => setLoaded(true)}
              className="w-full object-contain"
              draggable={false}
            />
          </button>
          {lightbox && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
              onClick={() => setLightbox(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media.url}
                alt={media.prompt || "Generated image"}
                className="animate-chip-pop max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                onClick={() => setLightbox(false)}
                className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        <video
          src={media.url}
          controls
          playsInline
          preload="metadata"
          className={cn(
            "animate-chip-pop w-full rounded-2xl border border-line bg-black",
            glass && "glass-btn",
          )}
        />
      )}
      {media.prompt ? (
        <p className="mt-1.5 line-clamp-2 px-1 text-[11.5px] text-faint">Prompt: {media.prompt}</p>
      ) : null}
    </div>
  );
}
