"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Blocks, ChevronDown, ChevronUp, ImageIcon, Mic, MonitorSmartphone, Plane, Plug, Plus, Square, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { INTEGRATIONS } from "@/lib/integrations/registry";
import { AddMenuButton, type AddMenuAction } from "@/components/chat/add-menu";

type PluginItem = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
};

const BRAND_LOGOS: Record<string, { src: string; className: string }> = {
  google: { src: "/logos/google.svg", className: "h-[16px] w-[16px]" },
  chrome: { src: "/logos/google.svg", className: "h-[16px] w-[16px]" },
  flyvia: { src: "/logos/flyvia.png", className: "h-[18px] w-[18px] rounded-[4px] object-contain" },
  plane: { src: "/logos/flyvia.png", className: "h-[18px] w-[18px] rounded-[4px] object-contain" },
};

function PluginIcon({ name, size = 15 }: { name: string; size?: number }) {
  const brand = BRAND_LOGOS[name];
  if (brand) {
    return <img src={brand.src} alt="" className={brand.className} draggable={false} />;
  }
  const icons: Record<string, React.ComponentType<{ size?: number }>> = {
    chrome: Blocks,
    plug: Plug,
    plane: Plane,
  };
  const Cmp = icons[name] ?? Plug;
  return <Cmp size={size} />;
}

export function Composer({
  onSend,
  onStop,
  generating,
  autoFocus,
  variant = "hero",
  computerUseActive,
  onToggleComputerUse,
  prefill,
}: {
  onSend: (
    value: string,
    mediaMode: "image" | "video" | null,
    videoOptions?: { model: "agnes-video-2.5-flash" | "agnes-video-v2.0"; seconds: number; aspectRatio: string } | null,
  ) => void;
  onStop?: () => void;
  generating?: boolean;
  autoFocus?: boolean;
  variant?: "hero" | "dock";
  computerUseActive?: boolean;
  onToggleComputerUse?: () => void;
  /** Externer Vorschlag (z. B. Beispiel vom Intro-Screen) → landet im Eingabefeld. */
  prefill?: { text: string; n: number } | null;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prefill || !prefill.text) return;
    setValue(prefill.text);
    requestAnimationFrame(() => ref.current?.focus());
  }, [prefill]);

  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [pluginsClosing, setPluginsClosing] = useState(false);
  const [connected, setConnected] = useState<PluginItem[] | null>(null);

  const closePlugins = () => {
    setPluginsClosing(true);
    window.setTimeout(() => {
      setPluginsOpen(false);
      setPluginsClosing(false);
    }, 130);
  };

  useEffect(() => {
    if (!pluginsOpen || pluginsClosing) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closePlugins();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePlugins();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pluginsOpen, pluginsClosing]);

  useEffect(() => {
    if (pluginsOpen && connected === null) {
      fetch("/api/integrations", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { integrations: [] }))
        .then((j) =>
          setConnected(
            (j.integrations as (PluginItem & { connection: unknown; enabled: boolean })[])
              .filter((i) => i.enabled && i.connection)
              .map(({ id, name, tagline, icon }) => ({ id, name, tagline, icon })),
          ),
        )
        .catch(() => setConnected([]));
    }
  }, [pluginsOpen, connected]);

  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const router = useRouter();

  const [mediaMode, setMediaMode] = useState<"image" | "video" | null>(null);
  const [videoModel, setVideoModel] = useState<"agnes-video-2.5-flash" | "agnes-video-v2.0">("agnes-video-2.5-flash");
  const [videoSeconds, setVideoSeconds] = useState(5);
  const [videoAspect, setVideoAspect] = useState("16:9");
  const videoOptions = useMemo(
    () =>
      mediaMode === "video"
        ? { model: videoModel, seconds: videoSeconds, aspectRatio: videoAspect }
        : null,
    [mediaMode, videoModel, videoSeconds, videoAspect],
  );

  const mentionCandidates = useMemo<PluginItem[]>(() => {
    const base: PluginItem[] = INTEGRATIONS.filter((i) => i.enabled).map(({ id, name, tagline, icon }) => ({
      id,
      name,
      tagline,
      icon,
    }));
    base.push({ id: "flyvia", name: "Flyvia", tagline: "Flight search · Travel", icon: "plane" });
    return base;
  }, []);

  const mentionResults = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    if (!q) return mentionCandidates;
    return mentionCandidates.filter((i) => {
      const hay = `${i.name} ${i.tagline}`.toLowerCase();
      return q.split(/\s+/).every((part) => hay.includes(part));
    });
  }, [mention, mentionCandidates]);

  useEffect(() => setMentionIndex(0), [mention?.query]);

  function updateMention(text: string, caret: number | null) {
    const pos = caret ?? text.length;
    const before = text.slice(0, pos);
    const m = before.match(/(^|\s)@([\wäöüß.\- ]*)$/i);
    if (m && m[2].length <= 32) {
      setMention({ query: m[2], start: pos - m[2].length - 1 });
    } else {
      setMention(null);
    }
  }

  function applyMention(item: PluginItem) {
    if (!mention) return;
    const pos = mention.start;
    const next = `${value.slice(0, pos)}@${item.name}${value.slice(pos + 1 + mention.query.length)}`;
    setValue(next);
    setMention(null);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const caret = pos + item.name.length + 1;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  useEffect(() => {
    if (!pluginsOpen) return;
    const t = window.setTimeout(() => ref.current?.blur(), 0);
    return () => window.clearTimeout(t);
  }, [pluginsOpen]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!mention) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMention(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [mention]);

  function submit() {
    if (generating) return;
    if (!value.trim()) return;
    setMention(null);
    setPluginsOpen(false);
    onSend(value, mediaMode, videoOptions);
    setValue("");
    setMediaMode(null);
  }

  function voice() {
    const w = window as typeof window & {
      webkitSpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      };
      SpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      };
    };
    const Speech = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Speech) return;
    const rec = new Speech();
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      setValue((v) => (v ? `${v} ${text}` : text));
    };
    rec.start();
  }

  const showMention = mention !== null;

  const noticeTimer = useRef<number | null>(null);

  function flashNotice(text: string) {
    setUploadNotice(text);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setUploadNotice(null), 4200);
  }

  useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  function handleAddAction(action: AddMenuAction) {
    setAddOpen(false);
    if (action.kind === "upload-files" || action.kind === "upload-image") {
      flashNotice(
        action.kind === "upload-image"
          ? "Bild-Upload ist hier noch nicht aktiv — lege Bilder über Barada Studio an."
          : "Datei-Upload ist hier noch nicht aktiv — lege Dateien über Barada Studio an.",
      );
      return;
    }
    if (action.kind === "upload-drive") {
      flashNotice("Drive ist noch nicht verbunden — siehe Plugins.");
      return;
    }
  }

  const VIDEO_SECONDS = [4, 5, 6, 8, 10, 12] as const;
  const VIDEO_ASPECTS: { ratio: string; hint: string }[] = [
    { ratio: "21:9", hint: "1680×720" },
    { ratio: "16:9", hint: "1280×720" },
    { ratio: "4:3", hint: "960×720" },
    { ratio: "1:1", hint: "720×720" },
    { ratio: "3:4", hint: "720×960" },
    { ratio: "9:16", hint: "720×1280" },
  ];

  const mentionChip =
    mention && mention.query.trim().length > 0
      ? mentionCandidates.find((i) => i.name.toLowerCase().startsWith(mention.query.toLowerCase().trim()))
      : null;

  // Dynamic Glow Intensity: range from 0.3 to 0.8 based on length (up to 100 chars)
  const glowIntensity = useMemo(() => {
    const base = 0.3;
    const max = 0.5;
    const intensity = base + (Math.min(value.length, 100) / 100) * max;
    return intensity;
  }, [value.length]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative mx-auto w-full",
        variant === "hero" ? "max-w-[720px]" : "max-w-[820px]",
      )}
    >
      {showMention && (
        <div
          className="animate-spatial-materialize absolute bottom-[calc(100%+12px)] left-0 z-40 w-full max-w-[340px] overflow-hidden rounded-3xl spatial-slab shadow-2xl backdrop-blur-2xl"
          role="listbox"
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-[10px] font-medium tracking-[0.14em] text-faint uppercase font-mono">Plugins</span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMention(null);
                ref.current?.focus();
              }}
              className="animate-chip-pop flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[11px] text-accent-strong transition hover:border-accent/60"
              title="Clear mention"
            >
              @{mention.query || "…"}
              <X size={11} />
            </button>
          </div>
          {mentionResults.length === 0 ? (
            <div className="px-4 py-3 text-[13px] text-faint">No plugin matches “{mention.query}”.</div>
          ) : (
            <ul className="max-h-[264px] overflow-y-auto pb-1">
              {mentionResults.map((item, idx) => {
                const first = idx === mentionIndex;
                return (
                  <li key={item.id} className="animate-item-rise" style={{ animationDelay: `${idx * 35}ms` }}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={first}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyMention(item);
                      }}
                      onMouseEnter={() => setMentionIndex(idx)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-left transition-all duration-150",
                        first
                          ? "bg-accent-soft shadow-[inset_0_0_0_1px_rgba(142,164,255,0.18)]"
                          : "hover:bg-white/[0.03]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150",
                          first
                            ? "border-accent/40 bg-accent-soft text-accent-strong"
                            : "border-glass-edge bg-white/[0.04] text-muted group-hover:text-accent",
                        )}
                      >
                        <PluginIcon name={item.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px]">
                          <span className="text-faint">@</span>
                          <Highlight text={item.name} query={mention!.query} />
                        </span>
                        <span className="block truncate text-[11.5px] text-faint">{item.tagline}</span>
                      </span>
                      {first && <ChevronUp size={13} className="mr-1 shrink-0 text-accent/70" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setMention(null);
              router.push("/plugins");
            }}
            className="flex w-full items-center gap-2 border-t border-glass-edge px-4 py-3 text-[12.5px] text-muted transition hover:bg-white/[0.04] hover:text-ink"
          >
            <Plus size={13} />
            Add more plugins
          </button>
        </div>
      )}

      <div
        style={{ "--glow-intensity": glowIntensity } as React.CSSProperties}
        className={cn(
          "control-pod-glow flex flex-col overflow-hidden rounded-3xl border bg-[#0b0b12]/90 transition-all duration-500 ease-in-out backdrop-blur-xl",
          mediaMode ? "border-accent/40 shadow-[0_0_24px_rgba(142,164,255,0.12)]" : "border-glass-edge",
        )}
      >
        {/* Morphing Media Area */}
        <div
          className={cn(
            "grid transition-all duration-500 ease-in-out overflow-hidden",
            mediaMode ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
          style={{ display: "grid" }}
        >
          <div className="overflow-hidden">
            <div className="px-5 pt-5 pb-2">
              {mediaMode === "image" ? (
                <div className="flex items-center justify-between bg-accent-soft/30 rounded-2xl p-3 border border-accent/20">
                  <span className="flex items-center gap-2 text-[13px] text-accent-strong font-medium">
                    <ImageIcon size={16} /> Image Generation Mode
                  </span>
                  <button
                    type="button"
                    onClick={() => setMediaMode(null)}
                    className="rounded-full p-1 hover:bg-white/10 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[13px] text-accent-strong font-medium">
                      <Video size={16} /> Video Generation Mode
                    </span>
                    <button
                      type="button"
                      onClick={() => setMediaMode(null)}
                      className="rounded-full p-1 hover:bg-white/10 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVideoModel("agnes-video-2.5-flash")}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left transition-all duration-200",
                        videoModel === "agnes-video-2.5-flash"
                          ? "border-accent/50 bg-accent-soft shadow-[0_0_14px_rgba(142,164,255,0.18)]"
                          : "border-glass-edge hover:border-accent/30",
                      )}
                    >
                      <span className="block text-[12px] text-ink font-light">Video 2.5 Flash</span>
                      <span className="mt-0.5 block text-[10px] text-faint">Free · 720P · fast</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoModel("agnes-video-v2.0")}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left transition-all duration-200",
                        videoModel === "agnes-video-v2.0"
                          ? "border-accent/50 bg-accent-soft shadow-[0_0_14px_rgba(142,164,255,0.18)]"
                          : "border-glass-edge hover:border-accent/30",
                      )}
                    >
                      <span className="block text-[12px] text-ink font-light">Video 2.0</span>
                      <span className="mt-0.5 block text-[10px] text-faint">Classic · up to 1088p</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1">
                      <span className="mb-2 block text-[10px] font-medium tracking-[0.12em] text-faint uppercase font-mono">Duration</span>
                      <div className="flex flex-wrap gap-1.5">
                        {VIDEO_SECONDS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setVideoSeconds(s)}
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[11px] transition-all duration-150",
                              videoSeconds === s
                                ? "border-accent/60 bg-accent-soft text-accent-strong"
                                : "border-glass-edge text-muted hover:border-accent/30 hover:text-ink",
                            )}
                          >
                            {s}s
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="mb-2 block text-[10px] font-medium tracking-[0.12em] text-faint uppercase font-mono">Aspect Ratio</span>
                      <div className="flex flex-wrap gap-1.5">
                        {VIDEO_ASPECTS.map((a) => (
                          <button
                            key={a.ratio}
                            type="button"
                            onClick={() => setVideoAspect(a.ratio)}
                            className={cn(
                              "rounded-lg border px-2 py-0.5 text-[11px] transition-all duration-150",
                              videoAspect === a.ratio
                                ? "border-accent/60 bg-accent-soft text-accent-strong"
                                : "border-glass-edge text-muted hover:border-accent/30 hover:text-ink",
                            )}
                          >
                            {a.ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 pb-5" />
          </div>
        </div>

        {/* Slash-Hinweis: nur Chatbar-Befehle, kein Fullscreen */}
        {value.trim() === "/" ||
        (/^\/(c|c o|co|com|comp|compu|comput|compute)/i.test(value.trim()) &&
          !/^\/computer\b/i.test(value.trim())) ? (
          <div className="mx-2 mb-1 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft/40 px-3 py-2 text-[12.5px] text-accent-strong">
            <MonitorSmartphone size={14} />
            <span>
              <span className="font-mono font-semibold">/computer</span>
              <span className="text-accent-strong/70"> — Computer-Modus in der Chatbar starten</span>
            </span>
          </div>
        ) : null}
        {value.trim() === "/computer" || /^\/computer\s*$/i.test(value.trim()) ? (
          <div className="mx-2 mb-1 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft/40 px-3 py-2 text-[12.5px] text-accent-strong">
            <MonitorSmartphone size={14} />
            <span>Enter = Computer-Modus aktivieren (bleibt in der Chatbar, kein Fullscreen)</span>
          </div>
        ) : null}

        {/* Input Area */}
        <div className="flex items-end gap-2 px-2 py-2">
          <AddMenuButton open={addOpen} onOpenChange={setAddOpen} onAction={handleAddAction} />
          {uploadNotice ? (
            <div
              role="status"
              className="animate-spatial-materialize mb-0.5 flex max-w-[240px] shrink-0 items-center gap-2 rounded-2xl border border-glass-edge bg-[#0b0b12]/95 px-3 py-2 text-[12px] leading-snug text-muted shadow-2xl backdrop-blur-xl"
            >
              <span className="shrink-0 text-accent-strong">i</span>
              <span className="min-w-0">{uploadNotice}</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => (pluginsOpen ? closePlugins() : setPluginsOpen(true))}
            aria-expanded={pluginsOpen}
            className={cn(
              "group mb-0.5 flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] transition-all duration-200",
              pluginsOpen
                ? "bg-accent-soft text-ink"
                : "text-muted hover:bg-white/5 hover:text-ink",
            )}
          >
            <Blocks
              size={16}
              className={cn(
                "transition-colors duration-200",
                pluginsOpen ? "text-accent-strong" : "text-accent group-hover:text-accent-strong",
              )}
            />
            <span className="hidden md:inline">Plugins</span>
            <ChevronDown
              size={14}
              className={cn("transition-transform duration-200", pluginsOpen && "rotate-180")}
            />
          </button>
          <textarea
            ref={ref}
            rows={1}
            value={value}
            placeholder={
              mediaMode === "image"
                ? "Describe the image to generate…"
                : mediaMode === "video"
                  ? "Describe the video to generate…"
                  : computerUseActive
                    ? "Computer-Auftrag beschreiben… (/search zurück)"
                    : "Nachricht an Verxa…"
            }
            onChange={(e) => {
              setValue(e.target.value);
              updateMention(e.target.value, e.target.selectionStart);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            style={{
              caretColor: "var(--accent-strong)",
            }}
            onKeyDown={(e) => {
              if (showMention && mentionResults.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((i) => (i + 1) % mentionResults.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  applyMention(mentionResults[mentionIndex]);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMention(null);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            onBlur={() => {
              window.setTimeout(() => {
                if (!rootRef.current?.contains(document.activeElement)) setMention(null);
              }, 120);
            }}
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-6 text-ink outline-none placeholder:text-faint font-light"
          />
          {mentionChip && (
            <span
              key={mentionChip.id}
              className="animate-chip-pop mb-1.5 flex shrink-0 items-center gap-1.5 rounded-full border border-accent/35 bg-accent-soft px-2.5 py-1 text-[12px] text-accent-strong"
            >
              <PluginIcon name={mentionChip.icon} size={12} />@{mentionChip.name}
            </span>
          )}
          <button
            type="button"
            onClick={() => onToggleComputerUse?.()}
            title="Computer Use — stays inside this chat"
            aria-pressed={Boolean(computerUseActive)}
            className={cn(
              "animate-chip-pop mb-0.5 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-all duration-200",
              computerUseActive
                ? "border-accent/50 bg-accent-soft text-ink"
                : "border-glass-edge text-muted hover:border-accent/30 hover:text-ink",
            )}
          >
            <MonitorSmartphone size={14} />
            <span className="hidden sm:inline">Computer Use</span>
            <span className="hidden rounded-full border border-amber-200/30 bg-amber-300/10 px-1.5 py-px text-[9.5px] font-medium tracking-wide text-amber-100/90 sm:inline">
              Soon
            </span>
            {computerUseActive ? (
              <span className="h-1.5 w-1.5 rounded-full bg-white/30/90 shadow-[0_0_6px_rgba(255,255,255,0.15)]" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={voice}
            className="mb-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-ink sm:flex"
            aria-label="Voice"
          >
            <Mic size={17} />
          </button>
          {generating ? (
            <button
              type="button"
              onClick={onStop}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-bg"
              aria-label="Stop generating"
            >
              <Square size={12} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!value.trim()}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-[#0b0b10] transition disabled:opacity-30"
              aria-label="Send"
            >
              <ArrowUp size={18} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
      {pluginsOpen && (
        <div
          className={cn(
            "animate-spatial-materialize absolute bottom-[calc(100%+12px)] left-0 z-40 w-[320px] overflow-hidden rounded-3xl spatial-slab shadow-2xl backdrop-blur-2xl",
            pluginsClosing && "closing",
          )}
          role="menu"
        >
          <div className="px-4 pt-3 pb-1 text-[10px] font-medium tracking-[0.14em] text-faint uppercase font-mono">
            Your plugins
          </div>
          {connected === null ? (
            <div className="space-y-2 px-4 pb-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-xl bg-white/[0.05]" />
              ))}
            </div>
          ) : connected.length === 0 ? (
            <div className="px-4 pb-3 text-[13px] leading-relaxed text-faint">
              No plugins connected yet.
            </div>
          ) : (
            <ul className="max-h-[240px] overflow-y-auto pb-1">
              {connected.map((item, idx) => (
                <li key={item.id} className="animate-item-rise" style={{ animationDelay: `${idx * 45}ms` }}>
                  <button
                    type="button"
                    onClick={() => {
                      closePlugins();
                      setValue((v) => `${v}${v && !v.endsWith(" ") ? " " : ""}@${item.name} `);
                      requestAnimationFrame(() => ref.current?.focus());
                    }}
                    className="group flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-left transition-all duration-150 hover:bg-accent-soft"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-glass-edge bg-white/[0.04] text-muted transition-colors duration-150 group-hover:border-accent/40 group-hover:text-accent-strong">
                      <PluginIcon name={item.icon} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] text-accent-strong">{item.name}</span>
                      <span className="block truncate text-[11.5px] text-faint">{item.tagline}</span>
                    </span>
                    <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white/30/80 shadow-[0_0_6px_rgba(255,255,255,0.15)]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setMention(null);
              router.push("/plugins");
            }}
            className="flex w-full items-center gap-2 border-t border-glass-edge px-4 py-3 text-[12.5px] text-muted transition hover:bg-white/[0.04] hover:text-ink"
          >
            <Plus size={13} />
            Add more plugins
          </button>
        </div>
      )}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.toLowerCase().replace(/^@/, "").trim();
  if (!q) return <span className="text-accent-strong">{text}</span>;
  const idx = text.toLowerCase().indexOf(q[0]);
  if (idx === -1) return <span className="text-accent-strong">{text}</span>;
  return (
    <>
      <span className="text-accent/75">{text.slice(0, idx)}</span>
      <span className="font-semibold text-accent-strong">
        {text.slice(idx, idx + q.length)}
      </span>
      <span className="text-accent/75">{text.slice(idx + q.length)}</span>
    </>
  );
}
