"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, MessageCircle, Search } from "lucide-react";
import type { Chat } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

export function MobileChatList({
  chats,
  emptyHint = "No conversations yet.",
}: {
  chats: Chat[];
  emptyHint?: string;
}) {
  if (!chats.length) {
    return (
      <div className="glass glass-spec flex flex-col items-center justify-center rounded-[22px] px-6 py-10 text-center">
        <MessageCircle size={22} className="mb-2 text-faint" />
        <p className="text-[13.5px] text-faint">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chats.map((chat, i) => (
        <Link
          key={chat.id}
          href={`/mobile/chats/${chat.id}`}
          className="glass glass-btn animate-lx-rise tab-item flex items-center gap-3 rounded-[18px] px-4 py-3.5"
          style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <MessageCircle size={15} className="text-muted" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] text-ink">
              {chat.title}
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] text-faint">
              {chat.preview || formatRelativeTime(chat.updatedAt)}
            </span>
          </span>
          <span className="shrink-0 text-[11.5px] text-faint">
            {formatRelativeTime(chat.updatedAt)}
          </span>
          <ChevronRight size={15} className="shrink-0 text-faint" />
        </Link>
      ))}
    </div>
  );
}

export function MobileChatSearch({
  chats,
}: {
  chats: Chat[];
}) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return chats
      .flatMap((chat) => {
        const titleHit = chat.title.toLowerCase().includes(query);
        const messageHits = chat.messages.filter((m) =>
          m.content.toLowerCase().includes(query),
        );
        if (!titleHit && !messageHits.length) return [];
        return [{ chat, snippet: messageHits[0]?.content ?? chat.preview }];
      })
      .slice(0, 40);
  }, [chats, q]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mobile-chrome shrink-0 px-4 pt-1 pb-2">
        <div className="glass glass-spec flex items-center gap-2 rounded-[16px] px-3.5 py-2.5">
          <Search size={16} className="shrink-0 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles and messages..."
            enterKeyHint="search"
            autoComplete="off"
            className="h-8 w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint"
          />
        </div>
      </div>
      <div className="mobile-scroll glass-fade-y min-h-0 flex-1 px-4 pb-4">
        {!q.trim() ? (
          <p className="glass animate-lx-rise rounded-[20px] px-4 pt-6 pb-8 text-center text-[13.5px] text-faint">
            Find a conversation by title or anything you said.
          </p>
        ) : results.length === 0 ? (
          <p className="glass animate-lx-rise rounded-[20px] px-4 pt-6 pb-8 text-center text-[13.5px] text-faint">
            No matching chats.
          </p>
        ) : (
          <div className="space-y-2">
            {results.map(({ chat, snippet }, i) => (
              <Link
                key={chat.id}
                href={`/mobile/chats/${chat.id}`}
                className="glass glass-btn animate-lx-rise tab-item block rounded-[18px] px-4 py-3"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[14.5px] text-ink">
                    {chat.title}
                  </span>
                  <span className="shrink-0 text-[11.5px] text-faint">
                    {formatRelativeTime(chat.updatedAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-muted">
                  {snippet}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
