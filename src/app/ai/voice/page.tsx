"use client";

import { useEffect, useRef, useState } from "react";
import { AiShell } from "@/components/ai/ai-shell";
import { useWorkspace } from "@/providers/workspace-provider";
import {
  readActiveChat,
  readPrefs,
  speakText,
  speechRecognitionSupported,
  stopSpeaking,
  writeActiveChat,
} from "@/lib/ai/prefs";

type Phase = "idle" | "listening" | "review" | "sending" | "speaking";

export default function VoicePage() {
  const { sendAiMessage, chats, status, streamingChatId } = useWorkspace();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(() => readActiveChat());
  const recogRef = useRef<{ stop: () => void } | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const replyRef = useRef("");

  const streaming = streamingChatId === chatId && status !== "idle";

  // Track the assistant reply of the voice chat for TTS playback.
  useEffect(() => {
    if (!chatId) return;
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    const last = chat.messages.at(-1);
    if (last?.role === "assistant" && last.content && last.content !== replyRef.current) {
      replyRef.current = last.content;
      setReply(last.content);
      if (readPrefs().ttsEnabled) {
        setPhase("speaking");
        speakText(last.content);
      } else {
        setPhase("review");
      }
    }
  }, [chats, chatId]);

  useEffect(() => () => {
    recogRef.current?.stop();
    mediaRef.current?.stream?.getTracks().forEach((t) => t.stop());
    stopSpeaking();
  }, []);

  function startListening() {
    setError(null);
    setTranscript("");
    setInterim("");
    setReply("");
    replyRef.current = "";

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
            // Last result block is final when recognition ends; treat all as
            // provisional until onend, accumulate the longest as transcript.
            interimText += alt.transcript;
          }
          final = interimText;
          setInterim(interimText);
        };
        rec.onerror = (e) => {
          if (e.error === "not-allowed") {
            setError("Microphone access was blocked. Allow it in your browser settings and try again.");
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
        /* fall through to recorder */
      }
    }

    // Fallback: record audio, send to the server transcription endpoint.
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
          setError("No audio was recorded. Please try again.");
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
            setError(json.error ?? "Transcription failed. Please try again.");
            setPhase("idle");
          }
        } catch {
          setError("Transcription failed. Please check your connection and try again.");
          setPhase("idle");
        }
      };
      mr.start();
      setPhase("listening");
    } catch {
      setError("Microphone access was blocked. Allow it in your browser settings and try again.");
      setPhase("idle");
    }
  }

  function stopListening() {
    recogRef.current?.stop();
    recogRef.current = null;
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    } else if (!speechRecognitionSupported()) {
      setPhase("idle");
    }
    // SpeechRecognition.onend will move to review; recorder.onstop handles its own path.
  }

  async function sendToAi() {
    const text = transcript.trim() || interim.trim();
    if (!text) return;
    setPhase("sending");
    setError(null);
    const id = await sendAiMessage(chatId, text);
    if (id) {
      writeActiveChat(id);
      window.location.href = `/ai/chat/${id}`;
      return;
    }
    setPhase("review");
  }

  const busy = phase === "sending" || streaming;

  return (
    <AiShell title="Voice" subtitle="Talk, review, send — the reply can play aloud">
      <div className="flex min-h-full flex-col items-center px-5 py-8">
        {/* Mic button */}
        <button
          onClick={() => (phase === "listening" ? stopListening() : startListening())}
          disabled={busy}
          aria-label={phase === "listening" ? "Stop recording" : "Start recording"}
          className="flex h-28 w-28 items-center justify-center rounded-full text-[40px] disabled:opacity-40"
          style={{
            background:
              phase === "listening"
                ? "linear-gradient(135deg,#f07178,#c2437b)"
                : "linear-gradient(135deg,#3b82f6,#1d4ed8)",
            boxShadow: phase === "listening" ? "0 0 0 12px rgba(240,113,120,0.15)" : undefined,
          }}
        >
          {phase === "listening" ? "■" : "◉"}
        </button>
        <p className="mt-4 text-[14px] text-white/60">
          {phase === "listening"
            ? "Listening… tap to stop"
            : busy
              ? "Working…"
              : phase === "speaking"
                ? "Speaking…"
                : "Tap the mic and speak"}
        </p>

        {error ? (
          <p className="mt-4 w-full rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
            {error}
          </p>
        ) : null}

        {/* Live / reviewed transcription */}
        {(interim || transcript) && (
          <div className="mt-5 w-full rounded-2xl bg-white/[0.06] p-4">
            <p className="text-[11px] tracking-widest text-white/40 uppercase">Transcription</p>
            <p className="mt-1 text-[15px] leading-6">
              {transcript || interim}
              {phase === "listening" && <span className="animate-pulse"> ▍</span>}
            </p>
            {phase === "review" && (
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl bg-black/40 p-3 text-[15px] outline-none"
                placeholder="Edit the transcription…"
              />
            )}
          </div>
        )}

        {phase === "review" && (
          <div className="mt-4 flex w-full gap-2">
            <button
              onClick={() => {
                setTranscript("");
                setReply("");
                setPhase("idle");
              }}
              className="min-h-[52px] flex-1 rounded-2xl bg-white/[0.07] text-[15px] active:bg-white/[0.14]"
            >
              Discard
            </button>
            <button
              onClick={() => void sendToAi()}
              disabled={!transcript.trim()}
              className="min-h-[52px] flex-1 rounded-2xl text-[15px] font-semibold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#8ea4ff,#5b7cff)" }}
            >
              Send to AI
            </button>
          </div>
        )}

        {/* AI reply */}
        {reply && (
          <div className="mt-4 w-full rounded-2xl bg-white/[0.06] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] tracking-widest text-white/40 uppercase">Verxa AI</p>
              <div className="flex gap-2">
                <button
                  onClick={() => speakText(reply)}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] active:bg-white/20"
                >
                  ▶ Replay
                </button>
                <button
                  onClick={() => {
                    stopSpeaking();
                    setPhase("review");
                  }}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] active:bg-white/20"
                >
                  ⏹ Stop
                </button>
              </div>
            </div>
            <p className="mt-1 max-h-56 overflow-y-auto text-[14px] leading-6 whitespace-pre-wrap">
              {reply}
            </p>
          </div>
        )}

        {!speechRecognitionSupported() && (
          <p className="mt-6 text-center text-[12px] text-white/35">
            Your browser has no on-device speech recognition — recordings are transcribed by the
            Verxa backend instead.
          </p>
        )}
      </div>
    </AiShell>
  );
}
