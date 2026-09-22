"use client";

import { useState } from "react";
import { AccountChrome } from "@/components/account/account-chrome";
import { Button, Card, Textarea, Toggle } from "@/components/ui/primitives";
import { useWorkspace } from "@/providers/workspace-provider";
import type { Personalization } from "@/lib/types";

const tones: Personalization["tone"][] = [
  "professional",
  "friendly",
  "direct",
  "casual",
];

const lengths: Personalization["responseLength"][] = [
  "short",
  "medium",
  "long",
];

export default function PersonalizationPage() {
  const { personalization, updatePersonalization } = useWorkspace();
  const [draft, setDraft] = useState(personalization);
  const [saved, setSaved] = useState(false);

  return (
    <AccountChrome
      title="Personalization"
      description="Tell Verxa how to sound, how long to write, and what it should already know about you."
    >
      <Card>
        <p className="mb-2 text-[13px] text-muted">Custom instructions</p>
        <Textarea
          value={draft.customInstructions}
          onChange={(e) =>
            setDraft({ ...draft, customInstructions: e.target.value })
          }
          placeholder="What should Verxa know about you?"
        />
      </Card>

      <Card>
        <p className="mb-3 text-[13px] text-muted">Preferred tone</p>
        <div className="flex flex-wrap gap-2">
          {tones.map((tone) => (
            <button
              key={tone}
              onClick={() => setDraft({ ...draft, tone })}
              className={`h-10 rounded-[10px] px-4 text-[13px] capitalize ${
                draft.tone === tone
                  ? "bg-accent-soft text-ink"
                  : "border border-line text-muted"
              }`}
            >
              {tone}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-[13px] text-muted">Preferred response length</p>
        <div className="flex gap-2">
          {lengths.map((responseLength) => (
            <button
              key={responseLength}
              onClick={() => setDraft({ ...draft, responseLength })}
              className={`h-10 rounded-[10px] px-4 text-[13px] capitalize ${
                draft.responseLength === responseLength
                  ? "bg-accent-soft text-ink"
                  : "border border-line text-muted"
              }`}
            >
              {responseLength}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-[13px] text-muted">Personality</p>
        {(
          [
            ["witty", "A little wit, never a performance"],
            ["concise", "Lead with the point"],
            ["curious", "Ask a clarifying question when it matters"],
            ["formal", "Keep language more formal"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-[14px]">{label}</span>
            <Toggle
              checked={draft.personality[key]}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  personality: { ...draft.personality, [key]: v },
                })
              }
            />
          </div>
        ))}
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => {
            updatePersonalization(draft);
            setSaved(true);
          }}
        >
          Save
        </Button>
        {saved ? <span className="text-[13px] text-ok">Saved</span> : null}
      </div>
    </AccountChrome>
  );
}
