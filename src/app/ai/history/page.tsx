"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiShell } from "@/components/ai/ai-shell";
import { useWorkspace } from "@/providers/workspace-provider";
import { readActiveChat, writeActiveChat } from "@/lib/ai/prefs";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function HistoryPage() {
  const router = useRouter();
  const { aiChats, deleteChat } = useWorkspace();
  const activeId = readActiveChat();

  function open(id: string) {
    writeActiveChat(id);
    router.push(`/ai/chat/${id}`);
  }

  return (
    <AiShell title="History" subtitle="Your real Verxa AI conversations">
      <div className="flex min-h-full flex-col px-4 py-4">
        <Link
          href="/ai"
          onClick={() => writeActiveChat(null)}
          className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold"
          style={{ background: "linear-gradient(135deg,#8ea4ff,#5b7cff)" }}
        >
          ＋ New conversation
        </Link>

        {aiChats.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-14 text-center">
            <span className="text-[40px] text-white/25">💬</span>
            <p className="mt-3 text-[15px] text-white/60">No conversations yet</p>
            <p className="mt-1 max-w-[260px] text-[12px] text-white/35">
              Everything you discuss with Verxa AI appears here — nothing is faked.
            </p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2 pb-4">
            {aiChats.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl bg-white/[0.06] p-4"
                style={c.id === activeId ? { outline: "1px solid rgba(142,164,255,0.5)" } : undefined}
              >
                <Link href={`/ai/chat/${c.id}`} onClick={() => writeActiveChat(c.id)} className="block w-full text-left">
                  <p className="truncate text-[15px] font-medium">{c.title}</p>
                  <p className="mt-0.5 truncate text-[12px] text-white/40">
                    {c.messages.length} message{c.messages.length === 1 ? "" : "s"} ·{" "}
                    {timeAgo(c.updatedAt)}
                  </p>
                  {c.preview ? (
                    <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-white/55">
                      {c.preview}
                    </p>
                  ) : null}
                </Link>
                <div className="mt-2 flex gap-2">
                  <Link
                    href={`/ai/chat/${c.id}`}
                    onClick={() => writeActiveChat(c.id)}
                    className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-white/[0.07] text-[13px] active:bg-white/[0.14]"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this conversation?")) deleteChat(c.id);
                    }}
                    className="min-h-[44px] rounded-xl bg-white/[0.07] px-5 text-[13px] text-red-300 active:bg-white/[0.14]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AiShell>
  );
}
