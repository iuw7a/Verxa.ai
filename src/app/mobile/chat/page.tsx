"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Square } from "lucide-react";
import { VerxaMark } from "@/components/brand/verxa-mark";
import { MessageList } from "@/components/chat/message-list";
import { ModelChangeButton } from "@/components/chat/model-change-button";
import { StitchBackground } from "@/components/stitch/stitch-background";
import { useWorkspace } from "@/providers/workspace-provider";
import { loadOnboarding } from "@/lib/invite-onboarding";

const CHAT_KEY = "verxa-sandbox-chat-mobile";

/**
 * Mobile invite sandbox — touch-optimized chat sharing the real
 * workspace engine. Same logic as desktop, mobile-first interface.
 */
export default function MobileChatPage() {
  const { createChat, chats, sendMessage, stopGenerating, status, streamingChatId, getChatModel, setChatModel } = useWorkspace();
  const [chatId, setChatId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ob = loadOnboarding("admin");
    if (ob.name) setName(ob.name);
    try {
      const existing = localStorage.getItem(CHAT_KEY);
      if (existing && chats.some((c) => c.id === existing)) {
        setChatId(existing);
        return;
      }
      const id = createChat(ob.name ? `Welcome ${ob.name}` : "Welcome");
      localStorage.setItem(CHAT_KEY, id);
      setChatId(id);
    } catch {
      setChatId((prev) => prev ?? createChat("Welcome"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chat = chats.find((c) => c.id === chatId) ?? null;
  const generating = streamingChatId === chatId && status !== "idle";

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat?.messages.length, status]);

  function send() {
    const text = value.trim();
    if (!text || !chatId || generating) return;
    setValue("");
    void sendMessage(chatId, text);
  }

  if (!chatId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black" aria-busy="true">
        <span className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
      </div>
    );
  }

  const empty = !chat || chat.messages.length === 0;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-black text-white">
      <StitchBackground />
      <header className="relative z-10 flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <VerxaMark size={20} />
        <span className="text-[14px] font-medium">Verxa AI</span>
        <Link
          href="/"
          className="ml-auto rounded-full border border-white/20 bg-white/[0.04] px-4 py-1.5 text-[12.5px] font-medium text-white/85 transition hover:border-white/40 hover:text-white"
        >
          Let&apos;s go
        </Link>
      </header>

      <div ref={scroller} className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
              <VerxaMark size={30} />
            </span>
            <h1 className="mt-5 text-[22px] font-medium tracking-tight">
              Welcome{name ? `, ${name}` : ""}.
            </h1>
            <p className="mt-1.5 max-w-[280px] text-[14px] text-white/55">
              What would you like to work on?
            </p>
          </div>
        ) : (
          <MessageList
            messages={chat.messages}
            status={status}
            isStreaming={generating}
            onCopy={async (text) => {
              try {
                await navigator.clipboard.writeText(text);
              } catch {
                /* clipboard unavailable */
              }
            }}
            onRegenerate={() => {}}
            onShare={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
              } catch {
                /* ignore */
              }
            }}
          />
        )}
        {generating ? (
          <div className="mt-3 flex justify-center">
            <button
              onClick={stopGenerating}
              className="rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-[12.5px] text-white/70"
            >
              Stop generating
            </button>
          </div>
        ) : null}
      </div>

      <div
        className="relative z-10 shrink-0 border-t border-white/10 bg-black/60 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor="mobile-sandbox-input" className="sr-only">
            Message Verxa
          </label>
          <textarea
            id="mobile-sandbox-input"
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Nachricht an Verxa…"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-white/30"
          />
          {generating ? (
            <button
              type="button"
              onClick={stopGenerating}
              aria-label="Stop generating"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={!value.trim()}
              aria-label="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition disabled:opacity-30"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
        <div className="mt-2 flex justify-center">
          <ModelChangeButton
            selectedId={getChatModel(chatId)}
            onSelect={(id) => setChatModel(chatId, id)}
          />
        </div>
      </div>
    </div>
  );
}
