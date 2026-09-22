"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, RefreshCw, Share } from "lucide-react";
import type { Message } from "@/lib/types";
import { FlightCards } from "@/components/chat/flight-cards";
import { MediaCard } from "@/components/chat/media-card";
import {
  ConnectPromptCard,
  IntegrationCard,
  IntegrationErrorCard,
} from "@/components/chat/integration-cards";
import { cn } from "@/lib/utils";
import { SpatialSlab } from "@/components/chat/spatial-slab";

const statusCopy: Record<string, string> = {
  thinking: "Thinking",
  searching: "Searching",
  searching_flights: "Searching Flyvia for the best flights…",
  generating_image: "Generating image…",
  generating_video: "Generating video…",
  reading: "Reading sources",
  preparing: "Preparing answer",
  streaming: "Writing",
};

function statusHiddenByMediaCard(status: string, media?: Message["media"]): boolean {
  if (!media || media.state !== "generating") return false;
  return status === "generating_image" || status === "generating_video";
}

function MentionText({ content }: { content: string }) {
  const parts = content.split(/(@[A-Za-z][\w-]*)/g);
  if (parts.length === 1) return <>{content}</>;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") && part.length > 1 ? (
          <span key={i} className="mention-text">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function MessageList({
  messages,
  status,
  isStreaming,
  glass,
  onCopy,
  onRegenerate,
  onShare,
}: {
  messages: Message[];
  status: string;
  isStreaming: boolean;
  glass?: boolean;
  onCopy: (text: string) => void | Promise<void>;
  onRegenerate: () => void;
  onShare: () => void | Promise<void>;
}) {
  const last = messages.at(-1);

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-8">
      {messages.map((message, i) => {
        const isLastAssistant =
          message.role === "assistant" && last?.id === message.id;
        const liveStatus =
          isLastAssistant &&
          isStreaming &&
          !message.content &&
          status !== "idle" &&
          !statusHiddenByMediaCard(status, message.media);

        return (
          <article
            key={message.id}
            className={cn(
              "animate-spatial-materialize mb-8",
              message.role === "user" && "flex justify-end",
            )}
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
          >
            {message.role === "user" ? (
              <SpatialSlab
                variant="user"
                className="max-w-[80%] rounded-[22px] rounded-br-[8px] px-5 py-3 text-[15px] leading-7 text-ink shadow-[0_10px_34px_-12px_var(--glow)]"
              >
                <MentionText content={message.content} />
              </SpatialSlab>
            ) : (
              <div className="w-full max-w-[85%]">
                {message.media ? <div className="mb-4"><MediaCard media={message.media} glass /></div> : null}
                {message.flights ? (
                  <FlightCards flights={message.flights} glass />
                ) : null}
                {message.connectPrompt ? (
                  <div className="mb-3">
                    <ConnectPromptCard attachment={message.connectPrompt} glass={glass} />
                  </div>
                ) : null}
                {message.integrationData ? (
                  <div className="mb-3">
                    <IntegrationCard attachment={message.integrationData} glass={glass} />
                  </div>
                ) : null}
                {message.integrationError ? (
                  <div className="mb-3">
                    <IntegrationErrorCard message={message.integrationError} glass={glass} />
                  </div>
                ) : null}
                {message.searchUnavailable ? (
                  <p className="glass-btn mb-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] text-faint font-mono">
                    Web search unavailable — answer not verified by sources
                  </p>
                ) : null}
                {message.sources?.length ? (
                  <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {message.sources.map((source, idx) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="glass-btn animate-lx-rise tab-item rounded-[16px] px-4 py-3 transition hover:text-ink"
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <div className="truncate text-[13px] text-ink font-medium">
                          {source.title}
                        </div>
                        <div className="truncate text-[11px] text-faint font-mono">
                          {source.url.replace(/^https?:\/\//, "")}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : null}
                {message.content ? (
                  <SpatialSlab
                    variant="assistant"
                    isStreaming={isStreaming && isLastAssistant}
                    className="p-6 rounded-[24px] markdown-body text-[16px] text-[var(--ai-text)] leading-relaxed"
                  >
                    <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                  </SpatialSlab>
                ) : liveStatus ? (
                  <StatusLine status={status} />
                ) : !message.media ? (
                  <p className="text-[14px] text-faint italic opacity-60">No response generated.</p>
                ) : null}
                {message.content && !(isStreaming && isLastAssistant) ? (
                  <div className="mt-3 flex items-center gap-2 text-faint pl-2">
                    <IconBtn label="Copy" onClick={() => onCopy(message.content)}>
                      <Copy size={14} />
                    </IconBtn>
                    <IconBtn label="Regenerate" onClick={onRegenerate}>
                      <RefreshCw size={14} />
                    </IconBtn>
                    <IconBtn label="Share" onClick={onShare}>
                      <Share size={14} />
                    </IconBtn>
                  </div>
                ) : null}
              </div>
            )}
          </article>
        );
      })}
      {isStreaming && last?.role === "user" ? (
        <div className="animate-spatial-materialize pl-2">
          <StatusLine status={status} />
        </div>
      ) : null}
    </div>
  );
}

function StatusLine({ status }: { status: string }) {
  return (
    <div
      key="status"
      className="animate-fade-in flex items-center gap-3 text-[14px] text-muted pl-2"
      aria-live="polite"
    >
      <span className="status-dot h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
      <span className="font-medium font-mono">{statusCopy[status] ?? "Thinking"}</span>
      <span className="status-dots" aria-hidden />
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="glass-btn rounded-full p-2 text-faint transition hover:text-ink hover:bg-white/5"
    >
      {children}
    </button>
  );
}
