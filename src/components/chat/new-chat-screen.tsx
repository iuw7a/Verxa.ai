"use client";

import { useRef, useState } from "react";
import { greetingForHour } from "@/lib/utils";
import { Composer } from "@/components/chat/composer";
import { ComputerIntroScreen } from "@/components/computer-use/computer-intro-screen";
import { ModelChangeButton } from "@/components/chat/model-change-button";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";

export function NewChatScreen() {
  const { profile, user } = useAuth();
  const { sendMessage, selectedModelId, setDefaultModel } = useWorkspace();
  // Nur Chatbar-Modus: true = Computer-Header/Variante (Bild 2),
  // false = normaler Suche-Header (Bild 1). Ersetzt NICHT mehr den
  // ganzen Screen — die große ComputerUseConsole kommt hier gar nicht.
  const [computerUseActive, setComputerUseActive] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; n: number } | null>(null);
  const prefillN = useRef(0);
  const name =
    profile.displayName || user?.email?.split("@")[0] || "there";

  function handleSend(
    value: string,
    mediaMode: "image" | "video" | null,
    videoOptions?: {
      model: "agnes-video-2.5-flash" | "agnes-video-v2.0";
      seconds: number;
      aspectRatio: string;
    } | null,
  ) {
    const text = value.trim();
    // Slash-Befehl nur aus der Chatbar: "/computer ..." aktiviert den
    // Computer-Modus, statt als normale Nachricht gesendet zu werden.
    if (/^\/computer\b/i.test(text)) {
      setComputerUseActive(true);
      return;
    }
    if (/^\/(search|chat|normal)\b/i.test(text)) {
      setComputerUseActive(false);
      const rest = text.replace(/^\/(search|chat|normal)\b\s*/i, "");
      if (!rest) return;
      void sendMessage(null, rest, mediaMode, videoOptions);
      return;
    }
    void sendMessage(null, value, mediaMode, videoOptions);
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-8 pb-6">
        {computerUseActive ? (
          <div className="max-h-full w-full max-w-[860px] overflow-y-auto">
            <ComputerIntroScreen
              onSelect={(text) => {
                prefillN.current += 1;
                setPrefill({ text, n: prefillN.current });
              }}
            />
          </div>
        ) : (
          <>
            <p className="text-[12px] font-medium tracking-[0.18em] text-white/40 uppercase">
              Suche
            </p>
            <h1 className="mt-2 text-center text-[38px] leading-tight font-medium tracking-[-0.03em] text-white">
              {greetingForHour()}
            </h1>
            <p className="mt-3 text-center text-[18px] font-light tracking-[-0.02em] text-white/60">
              How can Verxa help you today, {name}?
            </p>
            <p className="mt-2 text-center text-[12px] text-white/35">
              Tipp: /computer in der Chatbar für den Computer-Modus.
            </p>
          </>
        )}
      </div>
      <div className="relative max-h-[55%] shrink-0 overflow-y-auto px-6 pb-4">
        <Composer
          autoFocus
          variant="hero"
          computerUseActive={computerUseActive}
          onToggleComputerUse={() => setComputerUseActive((v) => !v)}
          onSend={handleSend}
          prefill={prefill}
        />
        {/* Models as one button — bottom of the chat page */}
        <div className="mx-auto mt-4 flex w-full max-w-[820px] justify-center">
          <ModelChangeButton selectedId={selectedModelId} onSelect={setDefaultModel} />
        </div>
        <p className="mt-3 text-center text-[12px] text-white/35">
          Verxa AI can make mistakes. Check important details.
        </p>
      </div>
    </div>
  );
}
