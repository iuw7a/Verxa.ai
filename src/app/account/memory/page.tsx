"use client";

import { useMemo, useState } from "react";
import { AccountChrome } from "@/components/account/account-chrome";
import { Button, Card, Input, Toggle } from "@/components/ui/primitives";
import { useWorkspace } from "@/providers/workspace-provider";

export default function MemoryPage() {
  const { memories, addMemory, updateMemory, deleteMemory, clearMemories } =
    useWorkspace();
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return memories;
    return memories.filter((m) => m.content.toLowerCase().includes(query));
  }, [memories, q]);

  return (
    <AccountChrome
      title="Memory"
      description="Verxa will remember these details to personalize your experience."
    >
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search memories"
        />
        <Button
          variant="subtle"
          onClick={() => {
            if (confirm("Clear all memories?")) clearMemories();
          }}
        >
          Clear all
        </Button>
      </div>

      <Card className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a memory, e.g. I prefer TypeScript."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addMemory(draft);
              setDraft("");
            }
          }}
        />
        <Button
          onClick={() => {
            addMemory(draft);
            setDraft("");
          }}
        >
          Add memory
        </Button>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-[14px] text-faint">No memories yet.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((memory) => (
            <Card key={memory.id} className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {editing === memory.id ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => {
                      updateMemory(memory.id, { content: editValue });
                      setEditing(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <p className="text-[14.5px] leading-6">{memory.content}</p>
                )}
              </div>
              <Toggle
                checked={memory.enabled}
                onChange={(v) => updateMemory(memory.id, { enabled: v })}
                label="Enabled"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(memory.id);
                  setEditValue(memory.content);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteMemory(memory.id)}
              >
                Delete
              </Button>
            </Card>
          ))}
        </div>
      )}
    </AccountChrome>
  );
}
