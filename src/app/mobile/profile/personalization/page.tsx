"use client";

import { useState } from "react";
import { MobileHeader, MobileShell } from "@/components/mobile/mobile-shell";
import { GlassToggle } from "@/components/mobile/profile-settings-ui";
import { useWorkspace } from "@/providers/workspace-provider";
import type { Personalization } from "@/lib/types";

const tones: Personalization["tone"][] = [
  "professional",
  "friendly",
  "direct",
  "casual",
];
const lengths: Personalization["responseLength"][] = ["short", "medium", "long"];

export default function MobilePersonalizationPage() {
  const { personalization, updatePersonalization } = useWorkspace();
  const [draft, setDraft] = useState(personalization);
  const [saved, setSaved] = useState(false);

  function save() {
    updatePersonalization(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <MobileShell>
      <MobileHeader title="AI personalization" backHref="/mobile/profile" />
      <div className="mobile-scroll glass-fade-y min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[560px] px-4 py-4">
          <section className="mb-5">
            <p className="mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
              Custom instructions
            </p>
            <textarea
              value={draft.customInstructions}
              onChange={(e) => {
                setDraft({ ...draft, customInstructions: e.target.value });
                setSaved(false);
              }}
              placeholder="What should Verxa know about you?"
              className="glass glass-spec min-h-[110px] w-full resize-none rounded-[20px] px-4 py-3 text-[15px] leading-6 text-ink outline-none placeholder:text-faint focus:border-white/25"
            />
          </section>

          <section className="mb-5">
            <p className="mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
              Preferred tone
            </p>
            <div className="flex flex-wrap gap-2">
              {tones.map((tone) => (
                <button
                  key={tone}
                  onClick={() => {
                    setDraft({ ...draft, tone });
                    setSaved(false);
                  }}
                  className={`tab-item rounded-full px-3.5 py-2 text-[13px] capitalize transition-all duration-300 ${
                    draft.tone === tone
                      ? "glass-cta font-medium"
                      : "glass-btn text-muted"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-5">
            <p className="mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
              Response length
            </p>
            <div className="flex gap-2">
              {lengths.map((len) => (
                <button
                  key={len}
                  onClick={() => {
                    setDraft({ ...draft, responseLength: len });
                    setSaved(false);
                  }}
                  className={`tab-item rounded-full px-3.5 py-2 text-[13px] capitalize transition-all duration-300 ${
                    draft.responseLength === len
                      ? "glass-cta font-medium"
                      : "glass-btn text-muted"
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
              Personality
            </p>
            <div className="glass glass-spec overflow-hidden rounded-[20px]">
              {(
                [
                  ["witty", "A little wit, never a performance"],
                  ["concise", "Lead with the point"],
                  ["curious", "Ask a clarifying question when it matters"],
                  ["formal", "Keep language more formal"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex min-h-[52px] items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 last:border-b-0"
                >
                  <span className="text-[14px] text-ink">{label}</span>
                  <GlassToggle
                    checked={draft.personality[key]}
                    onChange={(v) => {
                      setDraft({
                        ...draft,
                        personality: { ...draft.personality, [key]: v },
                      });
                      setSaved(false);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <button
            onClick={save}
            className="glass-cta tab-item mt-6 w-full rounded-[16px] py-3.5 text-[15px] font-medium"
          >
            {saved ? "Saved ✓" : "Save changes"}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
