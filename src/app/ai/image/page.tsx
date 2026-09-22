"use client";

import { useRef, useState } from "react";
import { AiShell } from "@/components/ai/ai-shell";
import { useWorkspace } from "@/providers/workspace-provider";
import { readActiveChat, writeActiveChat } from "@/lib/ai/prefs";

type State =
  | { kind: "empty" }
  | { kind: "preview"; dataUrl: string }
  | { kind: "analyzing"; dataUrl: string }
  | { kind: "done"; dataUrl: string; analysis: string; model: string }
  | { kind: "error"; dataUrl: string; message: string };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

export default function ImagePage() {
  const { sendAiMessage } = useWorkspace();
  const [state, setState] = useState<State>({ kind: "empty" });
  const [note, setNote] = useState("");
  const [continuing, setContinuing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState({
        kind: "error",
        dataUrl: "",
        message: "That file is not an image. Please choose a JPEG, PNG, or WebP photo.",
      });
      return;
    }
    if (file.size > 6_000_000) {
      setState({
        kind: "error",
        dataUrl: "",
        message: "This photo is too large (over ~6 MB). Please choose a smaller one.",
      });
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setState({ kind: "preview", dataUrl });
    } catch {
      setState({ kind: "error", dataUrl: "", message: "Could not read the image file." });
    }
  }

  async function analyze(dataUrl: string) {
    setState({ kind: "analyzing", dataUrl });
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, note: note.trim() || undefined }),
      });
      const json = (await res.json()) as { analysis?: string; model?: string; error?: string };
      if (!res.ok || !json.analysis) {
        setState({ kind: "error", dataUrl, message: json.error ?? "Image analysis failed." });
        return;
      }
      setState({ kind: "done", dataUrl, analysis: json.analysis, model: json.model ?? "" });
    } catch {
      setState({
        kind: "error",
        dataUrl,
        message: "Could not reach the analysis service. Check your connection and try again.",
      });
    }
  }

  async function continueInChat() {
    if (state.kind !== "done") return;
    setContinuing(true);
    const text = [
      "I analyzed a photo. Here is the result:",
      "",
      state.analysis,
      note.trim() ? `\nMy note about the photo: ${note.trim()}` : "",
      "",
      "Let's continue from here.",
    ].join("\n");
    const id = await sendAiMessage(readActiveChat(), text, { images: [state.dataUrl] });
    if (id) {
      writeActiveChat(id);
      window.location.href = `/ai/chat/${id}`;
    } else {
      setContinuing(false);
    }
  }

  const dataUrl =
    state.kind === "preview" || state.kind === "analyzing" || state.kind === "done" || state.kind === "error"
      ? state.dataUrl
      : null;

  return (
    <AiShell title="Image" subtitle="Meals, meter readings, documents">
      <div className="flex min-h-full flex-col px-4 py-5">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />

        {!dataUrl ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-white/15 text-white/60 active:bg-white/5"
          >
            <span className="text-[40px]">▣</span>
            <span className="text-[15px] font-medium text-white">Take or upload a photo</span>
            <span className="px-8 text-center text-[12px]">Meal, glucose meter, CGM screen, or document</span>
          </button>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt="Selected photo preview"
              className="max-h-[320px] w-full rounded-3xl object-contain bg-white/5"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setState({ kind: "empty" });
                  setNote("");
                }}
                className="min-h-[52px] flex-1 rounded-2xl bg-white/[0.07] text-[15px] active:bg-white/[0.14]"
              >
                New photo
              </button>
              {(state.kind === "preview" || state.kind === "error") && (
                <button
                  onClick={() => void analyze(state.dataUrl)}
                  className="min-h-[52px] flex-1 rounded-2xl text-[15px] font-semibold"
                  style={{ background: "linear-gradient(135deg,#8ea4ff,#5b7cff)" }}
                >
                  Analyze
                </button>
              )}
            </div>
          </>
        )}

        {state.kind === "error" && (
          <p className="mt-3 rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
            {state.message}
          </p>
        )}

        {(state.kind === "preview" || state.kind === "analyzing" || state.kind === "done") && (
          <label className="mt-3 block">
            <span className="text-[12px] text-white/50">Note for the AI (optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. lunch, before walking"
              className="mt-1 min-h-[52px] w-full rounded-2xl bg-white/[0.06] px-4 text-[16px] outline-none placeholder:text-white/30"
            />
          </label>
        )}

        {state.kind === "analyzing" && (
          <p className="mt-4 animate-pulse text-center text-[14px] text-white/60">
            Analyzing your photo…
          </p>
        )}

        {state.kind === "done" && (
          <div className="mt-4 rounded-2xl bg-white/[0.06] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] tracking-widest text-white/40 uppercase">Analysis</p>
              {state.model ? (
                <p className="text-[11px] text-white/30">{state.model}</p>
              ) : null}
            </div>
            <p className="mt-1 text-[14px] leading-6 whitespace-pre-wrap">{state.analysis}</p>
            <button
              onClick={() => void continueInChat()}
              disabled={continuing}
              className="mt-3 min-h-[52px] w-full rounded-2xl text-[15px] font-semibold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#8ea4ff,#5b7cff)" }}
            >
              {continuing ? "Opening chat…" : "Continue in chat →"}
            </button>
          </div>
        )}
      </div>
    </AiShell>
  );
}
