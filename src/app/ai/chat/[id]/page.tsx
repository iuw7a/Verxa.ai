"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AiShell } from "@/components/ai/ai-shell";
import { AiMessages } from "@/components/ai/ai-messages";
import { useWorkspace } from "@/providers/workspace-provider";
import { writeActiveChat } from "@/lib/ai/prefs";
import { useKeyboardViewport } from "@/lib/use-keyboard-viewport";
import { AI_DISCLAIMER } from "@/lib/ai/system";
import { AiMicOverlay } from "@/components/ai/ai-mic-overlay";
import { AiMediaSheet } from "@/components/ai/ai-media-sheet";

export default function AiChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const chatId = params.id;
  const { chats, aiChats, sendAiMessage, status, streamingChatId } = useWorkspace();
  const chat = chats.find((c) => c.id === chatId);
  const isAi = aiChats.some((c) => c.id === chatId);
  const kv = useKeyboardViewport();
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const streaming = streamingChatId === chatId && status !== "idle";

  const [mediaOpen, setMediaOpen] = useState(false);
  const [micOpen, setMicOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingNote, setPendingNote] = useState("");

  useEffect(() => {
    if (chat) writeActiveChat(chatId);
  }, [chat, chatId]);

  if (!chat) {
    return (
      <AiShell>
        <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-[40px]">💬</p>
          <h2 className="mt-3 text-[18px] font-medium">Chat nicht gefunden</h2>
          <p className="mt-1 max-w-[280px] text-[13px] leading-5 text-white/50">Dieser Chat existiert nicht oder wurde gelöscht.</p>
          <Link href="/ai" className="mt-6 rounded-full bg-white/[0.08] px-5 py-3 text-[14px] active:bg-white/15">
            Zurück zu Verxa AI
          </Link>
          <Link href="/ai/history" className="mt-2 text-[13px] text-white/50 underline">
            Verlauf öffnen
          </Link>
        </div>
      </AiShell>
    );
  }

  if (!isAi) {
    return (
      <AiShell>
        <div className="flex min-h-full flex-col">
          <div className="flex items-center gap-2 px-3 pt-2">
            <Link href="/ai" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/70" aria-label="Zurück">
              ‹
            </Link>
            <span className="truncate text-[14px] font-medium">{chat.title}</span>
          </div>
          <p className="mx-4 mt-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-[13px] text-amber-200">
            Dieser Chat gehört nicht zu Verxa AI. Öffne ihn unter{" "}
            <Link href={`/chat/${chatId}`} className="underline">
              /chat/{chatId}
            </Link>
            .
          </p>
          <div className="flex-1">
            <AiMessages messages={chat.messages} streaming={streaming} />
          </div>
        </div>
      </AiShell>
    );
  }

  function onInputChange(v: string) {
    setInput(v);
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + "px";
    }
  }

  async function handleSend() {
    if (pendingImage) {
      const note = pendingNote.trim() || input.trim() || "Analysiere dieses Bild";
      const pid = pendingImage;
      setPendingImage(null);
      setPendingNote("");
      setInput("");
      if (taRef.current) taRef.current.style.height = "auto";
      await sendAiMessage(chatId, note, { images: [pid] });
      return;
    }
    const raw = input.trim();
    if (!raw || status !== "idle") return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    await sendAiMessage(chatId, raw);
  }

  async function handleMicSend(text: string) {
    await sendAiMessage(chatId, text);
  }

  function handleImageSelected(dataUrl: string) {
    setPendingImage(dataUrl);
  }

  return (
    <AiShell>
      <div className="flex min-h-full flex-col">
        <div className="sticky top-0 z-10 flex items-center gap-2 bg-black/40 px-3 py-2 backdrop-blur">
          <button
            onClick={() => router.push("/ai")}
            aria-label="Zurück"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[18px] leading-none text-white active:bg-white/15"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium leading-tight">{chat.title}</p>
            <p className="truncate text-[11px] text-white/40">{chat.messages.length} Nachrichten · Verxa AI</p>
          </div>
          <Link href="/ai/history" className="shrink-0 rounded-full bg-white/[0.08] px-3 py-2 text-[12px] text-white/70 active:bg-white/15">
            Verlauf
          </Link>
        </div>

        <div className="flex-1">
          <AiMessages messages={chat.messages} streaming={streaming} />
          <div className="flex justify-center py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/verxa-logo.png" alt="Verxa" className="h-4 w-auto opacity-35" />
          </div>
        </div>

        {pendingImage ? (
          <div className="mx-3 mb-2 flex items-center gap-3 rounded-3xl bg-[#2a2e39] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage} alt="Vorschau" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] tracking-wide text-white/40 uppercase">Bild angehängt</p>
              <input
                value={pendingNote}
                onChange={(e) => setPendingNote(e.target.value)}
                placeholder="Notiz hinzufügen…"
                className="mt-1 w-full rounded-xl bg-black/30 px-3 py-2 text-[14px] outline-none placeholder:text-white/30"
              />
            </div>
            <button
              onClick={() => setPendingImage(null)}
              aria-label="Entfernen"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70"
            >
              ✕
            </button>
          </div>
        ) : null}

        {pendingImage ? (
          <div className="mx-3 mb-2 flex gap-2">
            <button
              onClick={() => void handleSend()}
              className="flex-1 rounded-full py-3 text-[14px] font-semibold text-white"
              style={{ background: "#2a4bff" }}
            >
              An Verxa senden
            </button>
          </div>
        ) : null}

        <div
          className="sticky bottom-0 z-20 px-3 pt-3"
          style={{
            paddingBottom: `max(env(safe-area-inset-bottom),12px)`,
            transform: kv.open ? `translateY(-${kv.inset}px)` : undefined,
            transition: "transform 120ms linear",
          }}
        >
          <div
            className="flex items-end gap-2 rounded-full px-2 py-2"
            style={{
              background: "#2a2e39",
              boxShadow: focused ? "0 0 0 1px rgba(142,164,255,0.35)" : "none",
            }}
          >
            <button
              onClick={() => setMediaOpen(true)}
              aria-label="Anhang hinzufügen"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[22px] leading-none text-white active:bg-white/15"
            >
              +
            </button>

            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              enterKeyHint="send"
              placeholder="Frag Verxa"
              className="max-h-[120px] min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2.5 text-[16px] leading-6 text-white outline-none placeholder:text-white/40"
            />

            <button
              onClick={() => setMicOpen(true)}
              aria-label="Mikrofon"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-transparent text-white/70 active:bg-white/10"
            >
              <MicIcon />
            </button>

            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() && !pendingImage && status !== "idle"}
              aria-label="Senden"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-30"
              style={{ background: "#2a4bff" }}
            >
              <WaveIcon />
            </button>
          </div>

          <p className="mt-2.5 text-center text-[11px] leading-4 text-white/25">{AI_DISCLAIMER}</p>
        </div>
      </div>

      <AiMicOverlay open={micOpen} onClose={() => setMicOpen(false)} onSend={handleMicSend} />
      <AiMediaSheet open={mediaOpen} onClose={() => setMediaOpen(false)} onImageSelected={handleImageSelected} />
    </AiShell>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" />
    </svg>
  );
}
function WaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 10v4M12 8v8M17 10v4" strokeLinecap="round" />
    </svg>
  );
}
