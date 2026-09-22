"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft, Cpu, Square } from "lucide-react";
import { MobileTaskBar } from "@/components/mobile/mobile-shell";
import { MessageList } from "@/components/chat/message-list";
import {
  CHAT_MODELS,
  DEFAULT_MODEL_ID,
  getModel,
} from "@/lib/models";
import { useKeyboardViewport } from "@/lib/use-keyboard-viewport";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/providers/workspace-provider";

function MobileModelSheet({
  modelId,
  onSelect,
  onClose,
}: {
  modelId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      onClick={onClose}
    >
      <div
        className="animate-lx-veil absolute inset-0 bg-black/50 backdrop-blur-[18px]"
        aria-hidden
      />
      <div
        className="glass-float glass-spec animate-lx-sheet relative mx-auto w-full max-w-[560px] rounded-t-[28px] border-x-0 border-b-0 pb-[max(env(safe-area-inset-bottom),14px)] pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
        <p className="px-5 pb-2 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
          Model
        </p>
        <div className="max-h-[52vh] overflow-y-auto overscroll-contain px-2 pb-1">
          {CHAT_MODELS.map((m) => {
            const selected = m.id === modelId;
            return (
              <button
                key={m.id}
                onClick={() => {
                  onSelect(m.id);
                  onClose();
                }}
                className={cn(
                  "tab-item mb-1.5 flex w-full items-start gap-3 rounded-[16px] px-4 py-3 text-left transition-colors",
                  selected ? "glass-btn border-white/25" : "border border-transparent",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] text-ink">{m.name}</span>
                  <span className="mt-0.5 block text-[12.5px] text-faint">
                    {m.description}
                  </span>
                </span>
                {selected ? (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_10px_2px_var(--glow)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MobileChatDetailPage() {
  const params = useParams<{ id: string }>();
  const chatId = params.id;
  const {
    chats,
    sendMessage,
    stopGenerating,
    regenerate,
    status,
    streamingChatId,
    getChatModel,
    setChatModel,
  } = useWorkspace();
  const chat = chats.find((c) => c.id === chatId);

  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [value, setValue] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const generating = streamingChatId === chatId && status !== "idle";
  const modelId = chat ? getChatModel(chatId) : DEFAULT_MODEL_ID;
  const activeModel = getModel(modelId) ?? CHAT_MODELS[0];
  const kb = useKeyboardViewport();
  const lifted = kb.open && kb.inset > 0;

  const handleScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    stickToBottom.current = nearBottom;
    setAtBottom(nearBottom);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Auto-scroll: keep the newest message in view as the conversation grows.
  const lastCount = useRef(0);
  useEffect(() => {
    const count = chat?.messages.length ?? 0;
    const isNewMessage = count !== lastCount.current;
    lastCount.current = count;
    if (isNewMessage || stickToBottom.current) {
      scrollToBottom(!isNewMessage);
      // A brand-new message always re-claims the stick state.
      if (isNewMessage) stickToBottom.current = true;
    }
  }, [chat?.messages, status, scrollToBottom]);

  useEffect(() => {
    stickToBottom.current = true;
    setAtBottom(true);
    scrollToBottom(false);
  }, [chatId, scrollToBottom]);

  if (!chat) {
    return (
      <div className="app-shell glass-root flex flex-col items-center justify-center text-ink">
        <div aria-hidden className="glass-stage" />
        <div aria-hidden className="glass-grain" />
        <div className="glass glass-spec relative rounded-[22px] px-8 py-7 text-center">
          <p className="text-[14px] text-muted">This chat was not found.</p>
          <Link href="/mobile/chats" className="mt-3 inline-block text-[13.5px] text-accent">
            Back to chats
          </Link>
        </div>
      </div>
    );
  }

  function submit() {
    const text = value.trim();
    if (!text || generating) return;
    setValue("");
    void sendMessage(chatId, text);
  }

  return (
    <div className="app-shell glass-root text-ink">
      <div aria-hidden className="glass-stage" />
      <div aria-hidden className="glass-grain" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* Floating glass header */}
        <header className="mobile-chrome no-select z-30 shrink-0 px-3 pt-2">
          <div className="glass-float glass-spec animate-lx-drop mx-auto flex h-[56px] w-full max-w-[560px] items-center gap-1 rounded-[22px] px-2">
            <Link
              href="/mobile/chats"
              aria-label="Back to chats"
              className="glass-icon-btn tab-item flex h-10 w-10 shrink-0"
            >
              <ChevronLeft size={21} />
            </Link>
            <button
              onClick={() => setModelOpen(true)}
              className="tab-item flex min-w-0 flex-1 items-center gap-2 rounded-full px-2 py-1.5 text-left"
            >
              <Cpu size={14} className="shrink-0 text-accent" />
              <span className="truncate text-[14.5px] font-medium text-ink">
                {activeModel.name}
              </span>
            </button>
          </div>
        </header>

        {/* Messages — the only scrolling surface */}
        <div
          ref={scroller}
          onScroll={handleScroll}
          className="mobile-scroll glass-fade-y min-h-0 flex-1"
        >
          <div className="mx-auto w-full max-w-[620px] py-5">
            <MessageList
              messages={chat.messages}
              status={status}
              isStreaming={generating}
              glass
              onCopy={async (text) => {
                await navigator.clipboard.writeText(text);
              }}
              onRegenerate={() => regenerate(chatId)}
              onShare={async () => {
                await navigator.clipboard.writeText(window.location.href);
              }}
            />
          </div>
        </div>

        {!atBottom ? (
          <button
            onClick={() => {
              stickToBottom.current = true;
              scrollToBottom();
            }}
            className="glass-icon-btn tab-item absolute right-4 z-20 flex h-10 w-10"
            style={{ bottom: lifted ? 12 : 108 }}
            aria-label="Scroll to latest"
          >
            <ArrowDown size={16} />
          </button>
        ) : null}

        {/* Floating glass composer — glides above the keyboard */}
        <div
          className="mobile-chrome z-40 shrink-0 px-3 pt-1.5"
          style={
            lifted
              ? {
                  transform: `translateY(-${kb.inset}px)`,
                  transition: "transform 160ms var(--glass-liquid)",
                }
              : { transition: "transform 260ms var(--glass-liquid)" }
          }
        >
          {generating ? (
            <div className="animate-fade-in mb-2 flex justify-center">
              <button
                onClick={stopGenerating}
                className="glass-btn tab-item flex items-center gap-2 rounded-full px-4 py-1.5 text-[12.5px] text-muted"
              >
                <Square size={9} fill="currentColor" />
                Stop generating
              </button>
            </div>
          ) : null}
          <div className="glass-float glass-spec mx-auto w-full max-w-[560px] rounded-[26px] px-2 py-2">
            <div className="flex items-end gap-1.5">
              <textarea
                rows={1}
                value={value}
                enterKeyHint="send"
                autoComplete="off"
                spellCheck={false}
                placeholder="Message Verxa..."
                onChange={(e) => {
                  setValue(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="max-h-[120px] min-h-[38px] w-full min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-[16px] leading-6 text-ink outline-none placeholder:text-faint"
              />
              {generating ? (
                <button
                  type="button"
                  onClick={stopGenerating}
                  aria-label="Stop"
                  className="glass-btn tab-item mb-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                >
                  <Square size={11} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!value.trim()}
                  aria-label="Send"
                  className="glass-cta tab-item mb-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
                >
                  <ArrowUp size={18} strokeWidth={2.4} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Floating glass dock — hidden while typing so the keyboard
            gets the full lower screen (Grok-style) */}
        {lifted ? null : <MobileTaskBar />}
      </div>

      {modelOpen ? (
        <MobileModelSheet
          modelId={modelId}
          onSelect={(id) => setChatModel(chatId, id)}
          onClose={() => setModelOpen(false)}
        />
      ) : null}
    </div>
  );
}
