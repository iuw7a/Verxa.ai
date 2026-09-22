"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/lib/types";

export function AiMessages({
  messages,
  streaming,
}: {
  messages: Message[];
  streaming: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, messages.at(-1)?.content.length, streaming]);

  if (!messages.length) return null;

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="flex justify-end">
            <div
              className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-[15px] leading-6 whitespace-pre-wrap"
              style={{ background: "var(--user-bubble)" }}
            >
              {m.content}
            </div>
          </div>
        ) : (
          <div key={m.id} className="flex gap-2.5">
            <div
              className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg,#8ea4ff,#a855f7,#22d3ee)" }}
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/verxa-logo.png"
                alt=""
                className="h-3.5 w-auto object-contain brightness-0 invert"
              />
            </div>
            <div className="ai-md min-w-0 flex-1 text-[15px] leading-7 text-white/90">
              {m.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              ) : (
                <span className="animate-pulse text-white/40">Denkt nach…</span>
              )}
            </div>
          </div>
        ),
      )}
      <div ref={bottomRef} />
      <style jsx global>{`
        .ai-md p { margin: 0 0 0.6em; }
        .ai-md p:last-child { margin-bottom: 0; }
        .ai-md ul, .ai-md ol { margin: 0 0 0.6em; padding-left: 1.2em; }
        .ai-md li { margin-bottom: 0.25em; }
        .ai-md code { background: rgba(255,255,255,0.09); border-radius: 6px; padding: 1px 5px; font-size: 0.87em; }
        .ai-md pre { background: rgba(255,255,255,0.06); border-radius: 12px; padding: 12px; overflow-x: auto; }
        .ai-md pre code { background: none; padding: 0; }
        .ai-md table { border-collapse: collapse; width: 100%; font-size: 13px; margin: 0.5em 0; display: block; overflow-x: auto; }
        .ai-md th, .ai-md td { border: 1px solid rgba(255,255,255,0.12); padding: 6px 8px; text-align: left; }
        .ai-md a { color: #8ea4ff; }
      `}</style>
    </div>
  );
}
