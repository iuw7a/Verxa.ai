"use client";

import { useRouter } from "next/navigation";
import { AiShell } from "@/components/ai/ai-shell";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { readActiveChat, writeActiveChat } from "@/lib/ai/prefs";
import { AI_DISCLAIMER } from "@/lib/ai/system";
import { AiMessages } from "@/components/ai/ai-messages";
import { useKeyboardViewport } from "@/lib/use-keyboard-viewport";
import { useEffect, useRef, useState } from "react";
import { AiMicOverlay } from "@/components/ai/ai-mic-overlay";
import { AiMediaSheet } from "@/components/ai/ai-media-sheet";

export default function AiHomePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { chats, aiChats, sendAiMessage, status, streamingChatId } = useWorkspace();
  const [activeId, setActiveId] = useState<string | null>(() => readActiveChat());
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const kv = useKeyboardViewport();
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Sheets & pending image like Image 2/3
  const [mediaOpen, setMediaOpen] = useState(false);
  const [micOpen, setMicOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingNote, setPendingNote] = useState("");

  useEffect(() => {
    if (activeId && !chats.some((c) => c.id === activeId)) {
      setActiveId(null);
      writeActiveChat(null);
    }
  }, [activeId, chats]);

  const activeChat =
    chats.find((c) => c.id === activeId) ??
    (activeId ? undefined : aiChats[0]) ??
    null;
  const effectiveId = activeChat?.id ?? null;
  const streaming = streamingChatId === effectiveId && status !== "idle";
  const hasMessages = Boolean(activeChat && activeChat.messages.length > 0);
  const name = profile.displayName || user?.email?.split("@")[0] || "Abdul";

  async function handleSend(text?: string) {
    const raw = (text ?? input).trim();
    // If pending image exists, send with image
    if (pendingImage) {
      const note = pendingNote.trim() || raw || "Analysiere dieses Bild";
      const id = await sendAiMessage(effectiveId, note, { images: [pendingImage] });
      setPendingImage(null);
      setPendingNote("");
      if (id) {
        setActiveId(id);
        writeActiveChat(id);
        router.push(`/ai/chat/${id}`);
      }
      return;
    }
    if (!raw || status !== "idle") return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    const id = await sendAiMessage(effectiveId, raw);
    if (id) {
      setActiveId(id);
      writeActiveChat(id);
      router.push(`/ai/chat/${id}`);
    } else if (effectiveId) {
      writeActiveChat(effectiveId);
    }
  }

  async function handleMicSend(text: string) {
    const id = await sendAiMessage(effectiveId, text);
    if (id) {
      setActiveId(id);
      writeActiveChat(id);
      router.push(`/ai/chat/${id}`);
    }
  }

  function handleImageSelected(dataUrl: string) {
    setPendingImage(dataUrl);
  }

  async function handlePendingSend() {
    if (!pendingImage) return;
    const note = pendingNote.trim() || "Analysiere dieses Bild";
    const id = await sendAiMessage(effectiveId, note, { images: [pendingImage] });
    setPendingImage(null);
    setPendingNote("");
    if (id) {
      setActiveId(id);
      writeActiveChat(id);
      router.push(`/ai/chat/${id}`);
    }
  }

  function newChat() {
    setActiveId(null);
    writeActiveChat(null);
    setPendingImage(null);
  }

  function onInputChange(v: string) {
    setInput(v);
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + "px";
    }
  }

  return (
    <AiShell>
      <div className="flex min-h-full flex-col">
        {!hasMessages ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-10">
            <div className="relative flex h-[52px] w-[52px] items-center justify-center">
              <div
                className="absolute h-[44px] w-[44px] rotate-45"
                style={{
                  background:
                    "conic-gradient(from 0deg, #ff4d6a 0%, #ffb84d 22%, #3dd68c 45%, #3aa8ff 68%, #a855f7 88%, #ff4d6a 100%)",
                  clipPath: "polygon(50% 0%, 58% 38%, 100% 50%, 58% 62%, 50% 100%, 42% 62%, 0% 50%, 42% 38%)",
                }}
              />
              <div
                className="absolute h-7 w-7 rotate-45 bg-black"
                style={{
                  clipPath: "polygon(50% 0%, 58% 38%, 100% 50%, 58% 62%, 50% 100%, 42% 62%, 0% 50%, 42% 38%)",
                  opacity: 0.0,
                }}
              />
            </div>

            <div className="mt-5 flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/verxa-logo.png" alt="Verxa" width={132} height={32} className="h-7 w-auto object-contain opacity-90" />
              <h1 className="mt-4 text-center text-[28px] font-light leading-tight tracking-tight text-white">
                Hallo {name}, lass
                <br />
                uns loslegen
              </h1>
            </div>

            <p className="mt-6 max-w-[280px] text-center text-[12px] leading-5 text-white/35">
              Verxa AI — dein Diabetes-Assistent. Frage, zeige ein Foto oder sprich einfach los.
            </p>
          </div>
        ) : (
          <div className="flex-1">
            <AiMessages messages={activeChat!.messages} streaming={streaming} />
            <div className="flex justify-center py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/verxa-logo.png" alt="Verxa" className="h-4 w-auto opacity-40" />
            </div>
          </div>
        )}

        {/* Pending image preview like upload sheet follow-up */}
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

        {/* + and camera quick row when pending */}
        {pendingImage ? (
          <div className="mx-3 mb-2 flex gap-2">
            <button
              onClick={() => void handlePendingSend()}
              className="flex-1 rounded-full py-3 text-[14px] font-semibold text-white"
              style={{ background: "#2a4bff" }}
            >
              An Verxa senden
            </button>
          </div>
        ) : null}

        {/* Pill composer — mic + media sheet like screenshots 1/2 */}
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
              <MicPillIcon />
            </button>

            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() && !pendingImage && status !== "idle"}
              aria-label="Senden"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-30"
              style={{ background: "#2a4bff" }}
            >
              <WavePillIcon />
            </button>
          </div>

          <p className="mt-2.5 text-center text-[11px] leading-4 text-white/25">{AI_DISCLAIMER}</p>

          {hasMessages && (
            <div className="flex justify-center pb-1 pt-2">
              <button onClick={newChat} className="rounded-full bg-white/[0.07] px-4 py-2 text-[12px] text-white/60 active:bg-white/12">
                ＋ Neuer Chat
              </button>
            </div>
          )}
        </div>
      </div>

      <AiMicOverlay open={micOpen} onClose={() => setMicOpen(false)} onSend={handleMicSend} />
      <AiMediaSheet open={mediaOpen} onClose={() => setMediaOpen(false)} onImageSelected={handleImageSelected} />
    </AiShell>
  );
}

function MicPillIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" />
    </svg>
  );
}
function WavePillIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 10v4M12 8v8M17 10v4" strokeLinecap="round" />
    </svg>
  );
}
