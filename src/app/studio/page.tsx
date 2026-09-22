"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  ImageIcon,
  Clapperboard,
  Wand2,
  Film,
  History,
  Upload,
  X,
  Download,
  Bookmark,
  RefreshCw,
  Play,
  Pencil,
  Trash2,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { AppFrame } from "@/components/sidebar/app-frame";
import { VerxaMark } from "@/components/brand/verxa-mark";
import { Button, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchLibrary,
  saveToLibrary,
  deleteLibraryItem,
  downloadMedia,
  extFor,
  type StudioMediaItem,
} from "@/lib/studio";

type Mode = "generate" | "edit" | "transform" | "image-to-video" | "video";

const MODES: { id: Mode; label: string; icon: React.ComponentType<{ size?: number | string; className?: string }>; desc: string }[] = [
  { id: "generate", label: "Image", icon: ImageIcon, desc: "Create an image from a text prompt." },
  { id: "edit", label: "Edit Image", icon: Pencil, desc: "Change parts of an image with an instruction." },
  { id: "transform", label: "Transform", icon: Wand2, desc: "Restyle the whole image — same subject, new look." },
  { id: "image-to-video", label: "Image to Video", icon: Film, desc: "Animate an image with camera motion." },
  { id: "video", label: "Video", icon: Clapperboard, desc: "Generate a video from a text prompt." },
];

const ASPECTS = ["16:9", "1:1", "9:16", "4:3", "3:4"] as const;
type Aspect = (typeof ASPECTS)[number];

type Job = {
  state: "idle" | "running" | "done" | "error";
  kind?: "image" | "video";
  url?: string;
  prompt?: string;
  error?: string;
  startedAt?: number;
};

const EXAMPLE_PROMPTS: Record<Mode, string[]> = {
  generate: [
    "Create a cinematic image of a futuristic city at night",
    "A cozy cabin in a snowy forest at night, warm windows glowing",
    "Studio product shot of a matte black watch on stone",
  ],
  edit: [
    "Change the person's clothes to a black suit",
    "Replace the background with a futuristic city",
    "Make this look like a cinematic photograph",
  ],
  transform: [
    "Make this look like a cinematic photograph",
    "Turn it into a moody noir scene with rain",
    "Restyle as a warm golden-hour portrait",
  ],
  "image-to-video": [
    "Make the camera slowly move forward",
    "Subtle parallax with drifting clouds",
    "The subject turns toward the camera slowly",
  ],
  video: [
    "Slow dolly through a neon-lit street in the rain",
    "Waves crashing on volcanic rock at sunset, cinematic",
    "Time-lapse of city lights turning on at dusk",
  ],
};

function needsImage(mode: Mode) {
  return mode === "edit" || mode === "transform" || mode === "image-to-video";
}

export default function BaradaStudioPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<Aspect>("16:9");
  const [source, setSource] = useState<{ url: string; name: string } | null>(null);
  const [job, setJob] = useState<Job>({ state: "idle" });
  const [compare, setCompare] = useState<{ original: string; edited: string } | null>(null);
  const [library, setLibrary] = useState<StudioMediaItem[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const runningRef = useRef(false);

  const signedIn = Boolean(user);
  const busy = job.state === "running";

  // ---------------- library ----------------
  const refreshLibrary = useCallback(async () => {
    if (!signedIn) {
      setLibrary([]);
      return;
    }
    const items = await fetchLibrary();
    setLibrary(items);
  }, [signedIn]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Elapsed timer while a job runs.
  useEffect(() => {
    if (job.state !== "running") return;
    setElapsed(0);
    const t0 = job.startedAt ?? Date.now();
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [job.state, job.startedAt]);

  // ---------------- upload ----------------
  function onPickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("Please choose an image file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setToast("Image too large (max 12 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSource({ url: dataUrl, name: file.name });
      setCompare(null);
      setJob({ state: "idle" });
      setSavedId(null);
    };
    reader.readAsDataURL(file);
  }

  // ---------------- generation ----------------
  const pollFal = useCallback(
    async (statusUrl: string, responseUrl: string): Promise<{ ok: true; kind: "image" | "video"; url: string } | { ok: false; error: string }> => {
      for (let attempt = 0; attempt < 120; attempt++) {
        if (!runningRef.current) return { ok: false, error: "cancelled" };
        try {
          const res = await fetch(`/api/generate/status?statusUrl=${encodeURIComponent(statusUrl)}&responseUrl=${encodeURIComponent(responseUrl)}`, { cache: "no-store" });
          const j = (await res.json()) as { state: string; kind?: string; url?: string; message?: string };
          if (j.state === "done" && j.url) return { ok: true, kind: j.kind === "video" ? "video" : "image", url: j.url };
          if (j.state === "error") return { ok: false, error: j.message ?? "Generation failed." };
        } catch {
          // transient network error — keep polling
        }
        await new Promise((r) => setTimeout(r, attempt < 10 ? 2500 : 5000));
      }
      return { ok: false, error: "Generation timed out. Please try again." };
    },
    [],
  );

  async function toSourceReference(url: string): Promise<string> {
    // The studio routes accept data URIs, /api/media/… paths and https URLs —
    // they normalize server-side, so the reference can be passed as-is.
    return url;
  }

  async function runGenerate() {
    const text = prompt.trim();
    if (runningRef.current) return;
    if (!signedIn) {
      setToast("Sign in to create with Barada Studio.");
      return;
    }
    if (needsImage(mode) && !source) {
      setToast("Upload or select an image first.");
      return;
    }
    if (!needsImage(mode) && text.length < 3) {
      setToast("Describe what to create.");
      return;
    }
    if (mode === "image-to-video" && text.length === 0) {
      // motion prompt optional — keep going
    }

    runningRef.current = true;
    setJob({ state: "running", startedAt: Date.now() });
    setSavedId(null);
    setCompare(null);

    try {
      if (mode === "generate" || mode === "video") {
        // --- text-to-image (sync) / text-to-video (async Agnes) ---
        if (mode === "generate") {
          const res = await fetch("/api/generate/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: text }),
          });
          const j = (await res.json()) as { url?: string; message?: string };
          if (!res.ok || !j.url) throw new Error(j.message ?? "Image generation failed.");
          setJob({ state: "done", kind: "image", url: j.url, prompt: text });
        } else {
          const res = await fetch("/api/generate/video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: text }),
          });
          const j = (await res.json()) as { videoId?: string; model?: string; message?: string };
          if (!res.ok || !j.videoId) throw new Error(j.message ?? "Video submission failed.");
          const out = await pollVideo(j.videoId, j.model);
          if (!out.ok) throw new Error(out.error);
          setJob({ state: "done", kind: "video", url: out.url, prompt: text });
        }
      } else {
        // --- fal queue: edit / transform / image-to-video ---
        const srcRef = await toSourceReference(source!.url);
        const endpoint = mode === "image-to-video" ? "/api/studio/image-to-video" : "/api/studio/image-edit";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: srcRef, prompt: text }),
        });
        const j = (await res.json()) as { statusUrl?: string; responseUrl?: string; message?: string };
        if (!res.ok || !j.statusUrl || !j.responseUrl) throw new Error(j.message ?? "The request could not be started.");
        const out = await pollFal(j.statusUrl, j.responseUrl);
        if (!out.ok) {
          if (out.error !== "cancelled") throw new Error(out.error);
          setJob({ state: "idle" });
          return;
        }
        if (mode === "image-to-video") {
          setJob({ state: "done", kind: "video", url: out.url, prompt: text || "Image to video" });
        } else {
          setJob({ state: "done", kind: "image", url: out.url, prompt: text });
          setCompare({ original: source!.url, edited: out.url });
        }
      }
    } catch (e) {
      setJob({ state: "error", error: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      runningRef.current = false;
    }
  }

  async function pollVideo(videoId: string, model?: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
    for (let attempt = 0; attempt < 90; attempt++) {
      if (!runningRef.current) return { ok: false, error: "cancelled" };
      try {
        const res = await fetch(`/api/generate/video?videoId=${encodeURIComponent(videoId)}${model ? `&model=${encodeURIComponent(model)}` : ""}`, { cache: "no-store" });
        const j = (await res.json()) as { state: string; url?: string; message?: string };
        if (j.state === "done" && j.url) return { ok: true, url: j.url };
        if (j.state === "error") return { ok: false, error: j.message ?? "Video generation failed." };
      } catch {
        // keep polling
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
    return { ok: false, error: "Video generation timed out. Please try again." };
  }

  function stop() {
    runningRef.current = false;
    setJob({ state: "idle" });
  }

  // ---------------- actions ----------------
  async function handleSave() {
    if (!job.url || saving) return;
    setSaving(true);
    const r = await saveToLibrary({
      kind: job.kind ?? "image",
      mode,
      prompt: job.prompt ?? prompt,
      url: job.url,
      aspectRatio: job.kind === "image" ? aspect : undefined,
      sourceAssetId: source ? undefined : undefined,
      parentId: undefined,
    });
    setSaving(false);
    if (r.item) {
      setSavedId(r.item.id);
      setLibrary((prev) => [r.item!, ...prev]);
      setToast("Saved to your library.");
    } else {
      setToast(r.error ?? "Could not save.");
    }
  }

  async function handleDelete(item: StudioMediaItem) {
    const ok = await deleteLibraryItem(item.id);
    if (ok) {
      setLibrary((prev) => prev.filter((x) => x.id !== item.id));
      if (source?.url.endsWith(item.url)) setSource(null);
      setToast("Deleted.");
    } else {
      setToast("Could not delete the item.");
    }
  }

  function loadSourceImage(url: string) {
    setSource({ url, name: "library item" });
    setCompare(null);
    setJob({ state: "idle" });
    setSavedId(null);
    setLibraryOpen(false);
    if (mode === "generate" || mode === "video") setMode("edit");
    setToast("Image loaded — describe your edit.");
  }

  async function startImageToVideoFromUrl(url: string) {
    setSource({ url, name: "generated image" });
    setMode("image-to-video");
    setPrompt("");
    setCompare(null);
    setJob({ state: "idle" });
    setSavedId(null);
    setLibraryOpen(false);
    setToast("Describe the motion, then generate.");
  }

  async function startImageToVideo(item: StudioMediaItem) {
    if (item.kind !== "image") return;
    setSource({ url: item.url, name: "library item" });
    setMode("image-to-video");
    setPrompt("");
    setCompare(null);
    setJob({ state: "idle" });
    setSavedId(null);
    setLibraryOpen(false);
    setToast("Describe the motion, then generate.");
  }

  function regenerate() {
    void runGenerate();
  }

  function download() {
    if (!job.url) return;
    downloadMedia(job.url, `barada-${mode}-${Date.now()}.${extFor(job.kind ?? "image")}`);
  }

  const statusCopy = useMemo(() => {
    if (job.state !== "running") return "";
    const base =
      mode === "video" || mode === "image-to-video"
        ? "Rendering video"
        : needsImage(mode)
          ? "Applying your edit"
          : "Generating image";
    if (elapsed < 20) return `${base}…`;
    if (elapsed < 75) return `${base} — this can take a moment`;
    return `${base} — still working, thanks for waiting`;
  }, [job.state, mode, elapsed]);

  const inputLabel = needsImage(mode)
    ? mode === "image-to-video"
      ? "Motion prompt (optional)"
      : "Edit instruction"
    : "Prompt";

  const placeholder =
    mode === "generate"
      ? "Create a cinematic image of a futuristic city at night…"
      : mode === "edit"
        ? "Change the background to a futuristic city…"
        : mode === "transform"
          ? "Make this look like a cinematic photograph…"
          : mode === "image-to-video"
            ? "Make the camera slowly move forward…"
            : "Slow dolly through a neon-lit street in the rain…";

  const ctaLabel =
    mode === "image-to-video" ? "Generate video" : mode === "video" ? "Generate video" : mode === "generate" ? "Generate image" : "Apply edit";

  return (
    <AppFrame topBar={<StudioTopBar />}>
      <div className="flex h-full min-h-0 flex-col xl:flex-row">
        {/* ============ Left rail: modes + library ============ */}
        <aside className="shrink-0 border-b border-line bg-sidebar/60 xl:w-[228px] xl:border-r xl:border-b-0">
          <div className="mobile-scroll-x flex items-center gap-3 overflow-x-auto px-3 py-3 xl:flex-col xl:items-stretch xl:overflow-visible xl:px-3 xl:py-4">
            <p className="eyebrow hidden px-1 pb-1 xl:block">Create</p>
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id);
                    setJob({ state: "idle" });
                    setCompare(null);
                    setSavedId(null);
                  }}
                  title={m.desc}
                  className={cn(
                    "focus-ring flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] font-medium transition",
                    active ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-white/[0.05] hover:text-ink",
                  )}
                >
                  <Icon size={16} />
                  <span className="whitespace-nowrap">{m.label}</span>
                </button>
              );
            })}
            <div className="hidden h-px bg-line xl:my-2 xl:block" />
            <button
              onClick={() => setLibraryOpen(true)}
              className="focus-ring flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-muted transition hover:bg-white/[0.05] hover:text-ink"
            >
              <History size={16} />
              <span className="whitespace-nowrap">Library</span>
              {library.length > 0 && (
                <span className="rounded-full bg-white/[0.07] px-1.5 text-[11px] text-faint">{library.length}</span>
              )}
            </button>
          </div>
        </aside>

        {/* ============ Center: composer + canvas ============ */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6">
              {/* Source image (edit/transform/i2v modes) */}
              {needsImage(mode) && (
                <div className="mb-4">
                  <p className="eyebrow mb-2">Source image</p>
                  {source ? (
                    <div className="bg-card group relative overflow-hidden rounded-[14px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={source.url} alt="Source" className="max-h-[300px] w-full object-contain" />
                      <button
                        onClick={() => {
                          setSource(null);
                          setCompare(null);
                        }}
                        aria-label="Remove source image"
                        className="absolute top-2.5 right-2.5 z-10 rounded-full border border-line bg-black/60 p-1.5 text-muted backdrop-blur transition hover:text-ink"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="hover-lift bg-card flex h-[170px] w-full flex-col items-center justify-center gap-2 rounded-[14px] text-faint transition"
                    >
                      <Upload size={20} />
                      <span className="text-[13.5px]">Click to upload an image</span>
                      <span className="text-[12px]">PNG or JPG · up to 12 MB</span>
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickFile(e.target.files?.[0])}
                  />
                </div>
              )}

              {/* Canvas / result area */}
              <div className="bg-card relative overflow-hidden rounded-[16px]">
                {job.state === "idle" && !source && (
                  <EmptyState
                    mode={mode}
                    signedIn={signedIn}
                    onSignInNeeded={() => setToast("Sign in to create with Barada Studio.")}
                  />
                )}

                {job.state === "idle" && source && (
                  <div className="flex aspect-video items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={source.url} alt="Source" className="max-h-full max-w-full object-contain opacity-80" />
                  </div>
                )}

                {job.state === "running" && <RunningState copy={statusCopy} elapsed={elapsed} kind={needsImage(mode) ? "image" : mode === "video" ? "video" : "image"} />}

                {job.state === "error" && (
                  <div className="flex aspect-video flex-col items-center justify-center gap-3 px-6 text-center">
                    <AlertTriangle size={22} className="text-danger" />
                    <p className="max-w-[420px] text-[14px] leading-relaxed text-muted">{job.error}</p>
                    <Button variant="outline" size="sm" onClick={regenerate}>
                      <RefreshCw size={14} /> Try again
                    </Button>
                  </div>
                )}

                {job.state === "done" && job.kind === "image" && (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={job.url} alt={job.prompt || "Generated image"} className="w-full object-contain" />
                    {compare && (
                      <div className="absolute top-2.5 left-2.5">
                        <Badge tone="accent">Edited</Badge>
                      </div>
                    )}
                  </div>
                )}

                {job.state === "done" && job.kind === "video" && (
                  <video src={job.url} controls playsInline preload="metadata" className="w-full bg-black" />
                )}
              </div>

              {/* Original / Edited comparison */}
              {compare && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(["original", "edited"] as const).map((label) => (
                    <div key={label} className="bg-card overflow-hidden rounded-[12px]">
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={compare[label]} alt={label} className="aspect-video w-full object-cover" />
                        <div className="absolute top-2 left-2">
                          <Badge tone={label === "edited" ? "accent" : "neutral"}>{label === "edited" ? "Edited" : "Original"}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                        <span className="text-[11.5px] text-faint">{label === "edited" ? "Your edit" : "Source"}</span>
                        <div className="flex gap-1">
                          <IconAction
                            title="Download"
                            onClick={() => downloadMedia(compare[label], `barada-${label}-${Date.now()}.png`)}
                          >
                            <Download size={13} />
                          </IconAction>
                          {label === "edited" && (
                            <IconAction
                              title="Continue editing this version"
                              onClick={() => loadSourceImage(compare.edited)}
                            >
                              <Pencil size={13} />
                            </IconAction>
                          )}
                          {label === "edited" && (
                            <IconAction title="Turn into video" onClick={() => startImageToVideoFromUrl(compare.edited)}>
                              <Film size={13} />
                            </IconAction>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Result actions */}
              {job.state === "done" && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={download}>
                    <Download size={14} /> Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || Boolean(savedId)}>
                    {savedId ? <Check size={14} /> : saving ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
                    {savedId ? "Saved" : saving ? "Saving…" : "Save"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={regenerate}>
                    <RefreshCw size={14} /> Regenerate
                  </Button>
                  {job.kind === "image" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => loadSourceImage(job.url!)}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => startImageToVideoFromUrl(job.url!)}>
                        <Film size={14} /> Turn into Video
                      </Button>
                    </>
                  )}
                  {job.kind === "video" && (
                    <Button variant="outline" size="sm" onClick={() => { setPrompt(job.prompt ?? ""); setMode("video"); }}>
                      <RefreshCw size={14} /> New variation
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-line bg-bg/80 p-3 backdrop-blur-xl sm:p-4">
            <div className="bg-card mx-auto max-w-[760px] rounded-[16px] p-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
              {prompt.trim() === "" && !needsImage(mode) && (
                <div className="mobile-scroll-x mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {EXAMPLE_PROMPTS[mode].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setPrompt(ex)}
                      className="focus-ring shrink-0 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-[12px] text-muted transition hover:border-accent/30 hover:text-ink"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void runGenerate();
                    }
                  }}
                  rows={2}
                  disabled={busy}
                  placeholder={placeholder}
                  aria-label={inputLabel}
                  className="input-base min-h-[52px] flex-1 resize-none border-0 bg-transparent px-2.5 py-2.5 text-[14.5px] shadow-none focus:shadow-none"
                />
                {busy ? (
                  <Button variant="outline" onClick={stop} className="shrink-0">
                    Stop
                  </Button>
                ) : (
                  <Button onClick={runGenerate} disabled={busy || (!signedIn || (needsImage(mode) ? !source : prompt.trim().length < 3))} className="shrink-0">
                    {ctaLabel}
                    <ArrowRight size={15} />
                  </Button>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between px-1">
                <span className="text-[11.5px] text-faint">
                  {needsImage(mode)
                    ? source
                      ? "Image ready — describe the change."
                      : "Upload an image to begin."
                    : "⌘↵ to generate"}
                </span>
                <span className="text-[11.5px] text-faint">{prompt.length}/2000</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ Right: settings ============ */}
        <aside className="shrink-0 border-t border-line bg-sidebar/60 xl:w-[248px] xl:border-t-0 xl:border-l">
          <div className="hidden px-4 py-4 xl:block">
            <p className="eyebrow mb-3">Settings</p>
            {mode === "generate" || mode === "video" ? (
              <>
                <p className="mb-1.5 text-[12.5px] font-medium text-muted">Aspect ratio</p>
                <div className="grid grid-cols-5 gap-1">
                  {ASPECTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAspect(a)}
                      className={cn(
                        "focus-ring rounded-[8px] border px-1 py-1.5 text-[11.5px] font-medium transition",
                        aspect === a ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-line text-muted hover:text-ink",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                  {mode === "generate" ? "Applies to saved images." : "Video length and model use the server defaults."}
                </p>
              </>
            ) : mode === "image-to-video" ? (
              <p className="text-[12.5px] leading-relaxed text-muted">
                The source image frames the video. Describe camera movement and scene motion — the model handles the rest.
              </p>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-muted">
                {mode === "edit"
                  ? "Edits keep the original composition and only change what you describe."
                  : "Transform restyles the whole image — subject stays, look changes."}
              </p>
            )}

            <div className="mt-5 border-t border-line pt-4">
              <p className="eyebrow mb-2">Details</p>
              <dl className="space-y-1.5 text-[12.5px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-faint">Mode</dt>
                  <dd className="text-muted">{MODES.find((m) => m.id === mode)?.label}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-faint">Engine</dt>
                  <dd className="text-muted">{mode === "video" || mode === "image-to-video" ? "Video model" : needsImage(mode) ? "Kontext" : "Flash"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-faint">Status</dt>
                  <dd className={cn(job.state === "error" && "text-danger", job.state === "done" && "text-ok")}>
                    {job.state === "running" ? "Working…" : job.state === "done" ? "Ready" : job.state === "error" ? "Failed" : "Idle"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <p className="eyebrow mb-2">Recent</p>
              {library.length === 0 ? (
                <p className="text-[12.5px] leading-relaxed text-faint">
                  {signedIn ? "Your generations appear here." : "Sign in to keep a library of your creations."}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {library.slice(0, 9).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => (item.kind === "image" ? loadSourceImage(item.url) : setJob({ state: "done", kind: "video", url: item.url, prompt: item.prompt }))}
                      title={item.prompt || item.mode}
                      className="focus-ring relative aspect-square overflow-hidden rounded-[8px] border border-line"
                    >
                      {item.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt={item.prompt || "Library item"} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-black/40">
                          <Play size={14} className="text-muted" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile settings summary */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 xl:hidden">
            <span className="text-[12px] text-faint">
              {MODES.find((m) => m.id === mode)?.label} · {needsImage(mode) ? "image input" : aspect}
            </span>
            <button onClick={() => setLibraryOpen(true)} className="focus-ring text-[12px] font-medium text-accent">
              Library ({library.length})
            </button>
          </div>
        </aside>
      </div>

      {/* ============ Library drawer ============ */}
      {libraryOpen && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Media library" onClick={() => setLibraryOpen(false)}>
          <div className="animate-lx-veil absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="animate-lx-rise absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-line bg-bg-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <div>
                <h2 className="text-[15px] font-medium">Media library</h2>
                <p className="text-[12px] text-faint">{library.length} saved item{library.length === 1 ? "" : "s"}</p>
              </div>
              <button onClick={() => setLibraryOpen(false)} aria-label="Close library" className="btn-ghost focus-ring rounded-full p-2">
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!signedIn ? (
                <p className="text-[13.5px] leading-relaxed text-muted">Sign in to keep a library of everything you create in Barada Studio.</p>
              ) : library.length === 0 ? (
                <p className="text-[13.5px] leading-relaxed text-muted">
                  Nothing saved yet. Generate something, then hit <span className="text-ink">Save</span> — it lands here.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {library.map((item) => (
                    <div key={item.id} className="bg-card hover-lift group overflow-hidden rounded-[12px]">
                      <div className="relative">
                        {item.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.url} alt={item.prompt || "Library item"} className="aspect-square w-full object-cover" />
                        ) : (
                          <span className="flex aspect-square w-full items-center justify-center bg-black/50">
                            <Play size={22} className="text-muted" />
                          </span>
                        )}
                        <div className="absolute top-1.5 left-1.5 flex gap-1">
                          <Badge tone={item.kind === "video" ? "accent" : "neutral"}>{item.kind}</Badge>
                        </div>
                      </div>
                      <div className="p-2.5">
                        <p className="mb-2 line-clamp-2 min-h-[2.4em] text-[11.5px] leading-[1.2em] text-faint">{item.prompt || item.mode}</p>
                        <div className="flex flex-wrap gap-1">
                          <IconAction title="Download" onClick={() => downloadMedia(item.url, `barada-${item.kind}-${item.id.slice(0, 8)}.${extFor(item.kind)}`)}>
                            <Download size={13} />
                          </IconAction>
                          {item.kind === "image" && (
                            <>
                              <IconAction title="Edit this image" onClick={() => loadSourceImage(item.url)}>
                                <Pencil size={13} />
                              </IconAction>
                              <IconAction title="Turn into video" onClick={() => startImageToVideo(item)}>
                                <Film size={13} />
                              </IconAction>
                            </>
                          )}
                          {item.kind === "video" && (
                            <IconAction title="Open video" onClick={() => { setJob({ state: "done", kind: "video", url: item.url, prompt: item.prompt }); setLibraryOpen(false); }}>
                              <Play size={13} />
                            </IconAction>
                          )}
                          <IconAction title="Delete" onClick={() => void handleDelete(item)} className="hover:text-danger">
                            <Trash2 size={13} />
                          </IconAction>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="animate-pop-up fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 xl:bottom-8">
          <div className="bg-card flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[13px] shadow-[var(--shadow)]">
            <Sparkles size={14} className="text-accent" />
            {toast}
          </div>
        </div>
      )}
    </AppFrame>
  );
}

// ---------- pieces ----------

function StudioTopBar() {
  return (
    <div className="flex items-center gap-3">
      <VerxaMark size={20} />
      <div>
        <h1 className="text-[14.5px] font-medium tracking-[-0.01em]">Barada Studio</h1>
        <p className="text-[11.5px] text-faint">Creative AI workspace</p>
      </div>
    </div>
  );
}

function EmptyState({ mode, signedIn, onSignInNeeded }: { mode: Mode; signedIn: boolean; onSignInNeeded: () => void }) {
  const active = MODES.find((m) => m.id === mode)!;
  const Icon = active.icon;
  return (
    <div className="hero-aurora flex aspect-video flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="bg-card flex h-12 w-12 items-center justify-center rounded-[14px]">
        <Icon size={20} className="text-accent" />
      </span>
      <h2 className="display-2 text-[19px]">{active.label}</h2>
      <p className="max-w-[380px] text-[13.5px] leading-relaxed text-muted">{active.desc}</p>
      {!signedIn && (
        <Button size="sm" variant="outline" onClick={onSignInNeeded}>
          Sign in to start creating
        </Button>
      )}
    </div>
  );
}

function RunningState({ copy, elapsed, kind }: { copy: string; elapsed: number; kind: "image" | "video" }) {
  return (
    <div className="hero-aurora flex aspect-video flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-[var(--accent)]/15 border-t-[var(--accent)]/80" style={{ animationDuration: "1.6s" }} />
        <VerxaMark size={26} />
      </span>
      <div>
        <p className="text-[14px] font-medium">{copy}</p>
        <p className="mt-1 text-[12px] text-faint tabular-nums">{elapsed}s · {kind === "video" ? "videos take 1–3 minutes" : "usually 10–30 seconds"}</p>
      </div>
    </div>
  );
}

function IconAction({
  children,
  title,
  onClick,
  className,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn("btn-ghost focus-ring rounded-[8px] p-1.5", className)}
    >
      {children}
    </button>
  );
}
