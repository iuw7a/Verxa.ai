"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { MobileHeader, MobileShell } from "@/components/mobile/mobile-shell";
import { GlassToggle } from "@/components/mobile/profile-settings-ui";
import { useWorkspace } from "@/providers/workspace-provider";

export default function MobileMemoryPage() {
  const { memories, addMemory, updateMemory, deleteMemory, clearMemories } =
    useWorkspace();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return memories;
    return memories.filter((m) => m.content.toLowerCase().includes(query));
  }, [memories, q]);

  return (
    <MobileShell>
      <MobileHeader title="Memory" backHref="/mobile/profile" />
      <div className="mobile-scroll glass-fade-y min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[560px] px-4 py-4">
          <div className="glass glass-spec flex items-center gap-2 rounded-[16px] px-3.5 py-2.5">
            <Search size={15} className="shrink-0 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search memories"
              autoComplete="off"
              className="h-8 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
            />
          </div>

          <div className="glass glass-spec mt-2.5 flex items-center gap-2 rounded-[16px] px-3.5 py-2">
            <Plus size={16} className="shrink-0 text-accent" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  addMemory(draft);
                  setDraft("");
                }
              }}
              placeholder="Add a memory, e.g. I prefer TypeScript."
              autoComplete="off"
              className="h-9 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
            />
            {draft.trim() ? (
              <button
                onClick={() => {
                  addMemory(draft);
                  setDraft("");
                }}
                className="glass-cta tab-item shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium"
              >
                Add
              </button>
            ) : null}
          </div>

          {memories.length > 0 ? (
            <button
              onClick={() => {
                if (confirm("Clear all memories?")) clearMemories();
              }}
              className="tab-item mt-3 ml-1 text-[12.5px] text-danger"
            >
              Clear all
            </button>
          ) : null}

          <div className="mt-4 space-y-2">
            {filtered.length === 0 ? (
              <p className="glass animate-lx-rise rounded-[20px] px-4 pt-6 pb-8 text-center text-[13.5px] text-faint">
                {memories.length === 0
                  ? "No memories yet — Verxa uses these to personalize replies."
                  : "No matching memories."}
              </p>
            ) : (
              filtered.map((m, i) => (
                <div
                  key={m.id}
                  className="glass glass-btn animate-lx-rise rounded-[18px] px-4 py-3"
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 text-[14px] leading-6 text-ink">
                      {m.content}
                    </p>
                    <GlassToggle
                      checked={m.enabled}
                      onChange={(v) => updateMemory(m.id, { enabled: v })}
                      label="Memory enabled"
                    />
                    <button
                      onClick={() => deleteMemory(m.id)}
                      aria-label="Delete memory"
                      className="tab-item mt-1 shrink-0 text-faint"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
