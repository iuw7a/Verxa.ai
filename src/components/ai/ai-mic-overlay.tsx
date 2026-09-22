"use client";

import { useEffect, useRef, useState } from "react";
import { readPrefs, speechRecognitionSupported, stopSpeaking } from "@/lib/ai/prefs";

type Phase = "idle" | "listening" | "review" | "sending";

export function AiMicOverlay({
  open,
  onClose,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => Promise<void> | void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recogRef = useRef<{ stop: () => void } | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (open) {
      // auto-start when opened
      setError(null);
      setTranscript("");
      setInterim("");
      setPhase("idle");
      // small delay to let overlay mount
      const t = setTimeout(() => startListening(), 180);
      return () => clearTimeout(t);
    } else {
      // cleanup when closed
      recogRef.current?.stop();
      recogRef.current = null;
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        try {
          mediaRef.current.stop();
        } catch {}
      }
      mediaRef.current?.stream?.getTracks().forEach((tr) => tr.stop());
      stopSpeaking();
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      recogRef.current?.stop();
      mediaRef.current?.stream?.getTracks().forEach((tr) => tr.stop());
      stopSpeaking();
    };
  }, []);

  function startListening() {
    setError(null);
    setTranscript("");
    setInterim("");

    if (speechRecognitionSupported()) {
      const w = window as unknown as Record<string, new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: ((e: { error: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      }>;
      const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
      try {
        const rec = new Rec();
        const lang = readPrefs().sttLang;
        rec.lang = lang === "auto" ? navigator.language || "en-US" : lang;
        rec.interimResults = true;
        rec.continuous = false;
        let final = "";
        rec.onresult = (e) => {
          let interimText = "";
          for (const res of Array.from(e.results)) {
            const alt = res[0];
            if (!alt) continue;
            interimText += alt.transcript;
          }
          final = interimText;
          setInterim(interimText);
        };
        rec.onerror = (e) => {
          if (e.error === "not-allowed") {
            setError("Mikrofon blockiert. In Browser-Einstellungen freigeben und erneut versuchen.");
            setPhase("idle");
          }
        };
        rec.onend = () => {
          recogRef.current = null;
          if (final.trim()) {
            setTranscript(final.trim());
            setInterim("");
            setPhase("review");
          } else {
            setPhase((p) => (p === "listening" ? "idle" : p));
          }
        };
        recogRef.current = rec;
        rec.start();
        setPhase("listening");
        return;
      } catch {
        /* fallback */
      }
    }
    void startRecorderFallback();
  }

  async function startRecorderFallback() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (!blob.size) {
          setError("Keine Aufnahme. Bitte erneut versuchen.");
          setPhase("idle");
          return;
        }
        setPhase("sending");
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
          const json = (await res.json()) as { ok?: boolean; text?: string; error?: string };
          if (json.ok && json.text) {
            setTranscript(json.text);
            setPhase("review");
          } else {
            setError(json.error ?? "Transkription fehlgeschlagen.");
            setPhase("idle");
          }
        } catch {
          setError("Transkription fehlgeschlagen. Verbindung prüfen.");
          setPhase("idle");
        }
      };
      mr.start();
      setPhase("listening");
    } catch {
      setError("Mikrofon blockiert. In Browser-Einstellungen freigeben und erneut versuchen.");
      setPhase("idle");
    }
  }

  function stopListening() {
    recogRef.current?.stop();
    recogRef.current = null;
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
  }

  async function handleSend() {
    const text = (transcript || interim).trim();
    if (!text) return;
    setPhase("sending");
    try {
      await onSend(text);
      onClose();
      setTranscript("");
      setInterim("");
      setPhase("idle");
    } catch {
      setError("Senden fehlgeschlagen. Bitte erneut versuchen.");
      setPhase("review");
    }
  }

  if (!open) return null;

  const listening = phase === "listening";
  const busy = phase === "sending";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "radial-gradient(130% 70% at 50% 100%, rgba(42,64,130,0.65) 0%, rgba(10,16,40,0.5) 45%, rgba(0,0,0,1) 78%), #000" }}>
      {/* Top bar like screenshot 1 */}
      <div className="flex shrink-0 items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <button
          aria-label="Menü öffnen"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.09]"
          onClick={onClose}
        >
          <span className="flex flex-col gap-1.5">
            <span className="block h-[1.5px] w-4 bg-white/85" />
            <span className="block h-[1.5px] w-4 bg-white/85" />
          </span>
        </button>
        <div className="min-w-0 flex-1" />
        {/* muted icon like screenshot top right first */}
        <button
          aria-label="Stumm"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.09] text-white/70"
          onClick={onClose}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M3 11l5-5h4l5 5v2l-5 5H8l-5-5z" />
            <path d="M9 9l6 6M15 9l-6 6" />
          </svg>
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white" style={{ background: "#d12b6b" }}>
          A
        </div>
      </div>

      {/* Center */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {error ? (
          <p className="w-full max-w-[300px] rounded-2xl bg-red-500/15 px-4 py-3 text-center text-[13px] text-red-200">{error}</p>
        ) : phase === "review" ? (
          <div className="w-full max-w-[340px] rounded-3xl bg-white/[0.08] p-4 backdrop-blur">
            <p className="text-[11px] tracking-widest text-white/40 uppercase">Transkription</p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-xl bg-black/30 p-3 text-[15px] leading-6 outline-none"
              placeholder="Bearbeiten…"
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setTranscript("");
                  setInterim("");
                  setPhase("idle");
                }}
                className="min-h-[48px] flex-1 rounded-full bg-white/[0.08] text-[14px] active:bg-white/15"
              >
                Verwerfen
              </button>
              <button
                onClick={() => void handleSend()}
                disabled={!transcript.trim()}
                className="min-h-[48px] flex-1 rounded-full text-[14px] font-semibold text-white disabled:opacity-40"
                style={{ background: "#2a4bff" }}
              >
                Senden
              </button>
            </div>
          </div>
        ) : listening ? (
          <>
            <p className="text-[14px] text-white/70">{interim ? interim : "Höre zu… tippe zum Stoppen"}</p>
            {interim ? <p className="mt-2 max-w-[300px] text-center text-[13px] leading-5 text-white/50">{interim}</p> : null}
            <p className="mt-2 text-[11px] text-white/30">{speechRecognitionSupported() ? "On-device" : "Server-Transkription"}</p>
          </>
        ) : busy ? (
          <p className="animate-pulse text-[14px] text-white/60">Sende…</p>
        ) : (
          <p className="text-center text-[13px] leading-5 text-white/40">
            Tippe auf das Mikro und sprich.<br />
            <span className="text-white/25">Deine Aufnahme wird zu Verxa gesendet.</span>
          </p>
        )}
      </div>

      {/* Bottom bar like screenshot 1 — 5 icons */}
      <div className="shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <button
            aria-label="Kamera"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.09] text-white/80 active:bg-white/15"
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="7" width="15" height="10" rx="3" />
              <circle cx="10.5" cy="12" r="2.2" />
              <path d="M18 10l3-2v8l-3-2" />
            </svg>
          </button>

          <button
            aria-label="Hochladen"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.09] text-white/80 active:bg-white/15"
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M12 8v8M8.5 11.5l3.5-3.5 3.5 3.5" />
            </svg>
          </button>

          {/* Center pill — animated */}
          <button
            aria-label={listening ? "Stoppen" : "Aufnehmen"}
            onClick={() => (listening ? stopListening() : startListening())}
            disabled={busy}
            className="relative flex h-14 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full disabled:opacity-40"
            style={{
              background: listening
                ? "linear-gradient(180deg, #0a0a0f 0%, #0e1a3a 40%, #1e3cff 100%)"
                : "linear-gradient(180deg, #141824 0%, #1c2540 60%, #2336a8 100%)",
              boxShadow: listening ? "0 8px 28px rgba(42,75,255,0.55), inset 0 1px 0 rgba(255,255,255,0.15)" : "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <span className={`absolute inset-0 rounded-full ${listening ? "animate-pulse" : ""}`} style={{ background: "radial-gradient(80% 90% at 50% 100%, rgba(80,120,255,0.9) 0%, rgba(20,40,120,0.0) 70%)" }} />
            <span className={`relative h-2 w-2 rounded-full bg-white ${listening ? "animate-ping" : ""}`} style={{ animationDuration: "1.1s" }} />
            {listening ? <span className="relative ml-2 text-[12px] font-medium tracking-wide text-white/90">● Aufnahme</span> : <span className="relative text-[12px] font-medium text-white/80">Tippen zum Sprechen</span>}
          </button>

          <button
            aria-label="Mikrofon"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white active:bg-white/15 ${listening ? "bg-[#d12b6b]" : "bg-white/[0.09]"}`}
            onClick={() => (listening ? stopListening() : startListening())}
            disabled={busy}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="9" y="4" width="6" height="10" rx="3" />
              <path d="M5 11a7 7 0 0014 0M12 18v3" />
            </svg>
          </button>

          <button
            aria-label="Schließen"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.09] text-white/80 active:bg-white/15"
            onClick={() => {
              if (listening) stopListening();
              onClose();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
