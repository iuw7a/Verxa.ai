"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/primitives";
import { useWorkspace } from "@/providers/workspace-provider";
import { formatRelativeTime } from "@/lib/utils";

export default function SearchPage() {
  const { chats } = useWorkspace();
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
        return [
          {
            chat,
            snippet: messageHits[0]?.content ?? chat.preview,
          },
        ];
      })
      .slice(0, 40);
  }, [chats, q]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[720px] px-8 py-16">
        <h1 className="text-[28px] font-light tracking-[-0.04em]">Search</h1>
        <p className="mt-2 text-[14px] text-muted">
          Find a conversation by title or anything you said.
        </p>
        <div className="mt-8">
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats..."
          />
        </div>
        <div className="mt-8 space-y-2">
          {!q ? (
            <p className="text-[14px] text-faint">Start typing to search.</p>
          ) : results.length === 0 ? (
            <p className="text-[14px] text-faint">No matching chats.</p>
          ) : (
            results.map(({ chat, snippet }) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="block rounded-[14px] border border-transparent px-4 py-3 hover:border-line hover:bg-white/[0.03]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="truncate text-[15px]">{chat.title}</div>
                  <div className="shrink-0 text-[12px] text-faint">
                    {formatRelativeTime(chat.updatedAt)}
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-muted">
                  {snippet}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
