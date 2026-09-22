"use client";

import { useMemo, useState } from "react";
import { AiShell } from "@/components/ai/ai-shell";
import { useWorkspace } from "@/providers/workspace-provider";

export default function MemoryPage() {
  const { memories, addMemory, updateMemory, deleteMemory, clearMemories } =
    useWorkspace();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return memories;
    return memories.filter((m) => m.content.toLowerCase().includes(query));
  }, [memories, q]);

  const enabledCount = useMemo(() => memories.filter((m) => m.enabled).length, [memories]);

  function submitDraft() {
    if (!draft.trim()) return;
    addMemory(draft);
    setDraft("");
  }

  return (
    <AiShell
      title="Memory"
      subtitle={
        memories.length
          ? `${enabledCount} of ${memories.length} active in conversations`
          : "What Verxa remembers about you"
      }
    >
      <div className="flex min-h-full flex-col gap-3 px-4 py-4">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search memories"
            className="min-h-[52px] flex-1 rounded-2xl bg-white/[0.06] px-4 text-[16px] outline-none placeholder:text-white/30"
          />
          {memories.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Delete all memories?")) clearMemories();
              }}
              className="min-h-[52px] shrink-0 rounded-2xl bg-white/[0.06] px-4 text-[13px] text-red-300 active:bg-white/[0.12]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitDraft();
            }}
            enterKeyHint="done"
            placeholder="Add a memory, e.g. I take metformin in the morning"
            className="min-h-[52px] flex-1 rounded-2xl bg-white/[0.06] px-4 text-[16px] outline-none placeholder:text-white/30"
          />
          <button
            onClick={submitDraft}
            disabled={!draft.trim()}
            aria-label="Add memory"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl text-[22px] disabled:opacity-30"
            style={{ background: "linear-gradient(135deg,#8ea4ff,#5b7cff)" }}
          >
            +
          </button>
        </div>

        <p className="text-[12px] leading-5 text-white/40">
          Active memories are used by the assistant when answering. Never store passwords or
          highly sensitive data here.
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-14 text-center">
            <span className="text-[40px] text-white/25">🧠</span>
            <p className="mt-3 text-[15px] text-white/60">No memories yet</p>
            <p className="mt-1 max-w-[260px] text-[12px] text-white/35">
              Save routines, preferences, and schedules — Verxa AI will use them in every chat.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl bg-white/[0.06] p-4"
                style={m.enabled ? undefined : { opacity: 0.55 }}
              >
                {editingId === m.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editValue}
                      autoFocus
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editValue.trim()) {
                          updateMemory(m.id, { content: editValue.trim() });
                          setEditingId(null);
                        }
                      }}
                      className="min-h-[52px] flex-1 rounded-xl bg-black/40 px-3 text-[15px] outline-none"
                    />
                    <button
                      onClick={() => {
                        if (editValue.trim()) updateMemory(m.id, { content: editValue.trim() });
                        setEditingId(null);
                      }}
                      className="min-h-[52px] rounded-xl bg-white/10 px-4 text-[14px] font-semibold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[15px] leading-6">{m.content}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => updateMemory(m.id, { enabled: !m.enabled })}
                        aria-pressed={m.enabled}
                        className="flex min-h-[44px] items-center gap-2 rounded-full px-3 text-[13px]"
                        style={{
                          background: m.enabled ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.07)",
                          color: m.enabled ? "#6ee7b7" : "rgba(255,255,255,0.5)",
                        }}
                      >
                        <span
                          className="inline-block h-5 w-9 rounded-full p-0.5"
                          style={{ background: m.enabled ? "#34d399" : "rgba(255,255,255,0.2)" }}
                        >
                          <span
                            className="block h-4 w-4 rounded-full bg-white"
                            style={{ marginLeft: m.enabled ? "14px" : "0" }}
                          />
                        </span>
                        {m.enabled ? "Active" : "Paused"}
                      </button>
                      <span className="flex-1" />
                      <button
                        onClick={() => {
                          setEditingId(m.id);
                          setEditValue(m.content);
                        }}
                        className="min-h-[44px] rounded-full bg-white/[0.07] px-4 text-[13px] active:bg-white/[0.14]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMemory(m.id)}
                        className="min-h-[44px] rounded-full bg-white/[0.07] px-4 text-[13px] text-red-300 active:bg-white/[0.14]"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AiShell>
  );
}
