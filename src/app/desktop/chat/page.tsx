"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ActiveChatScreen } from "@/components/layout/active-chat-screen";
import { StitchBackground } from "@/components/stitch/stitch-background";
import { useWorkspace } from "@/providers/workspace-provider";
import { loadOnboarding } from "@/lib/invite-onboarding";

const CHAT_KEY = "verxa-sandbox-chat-desktop";

/**
 * Desktop invite sandbox. Shares the real chat engine (workspace provider)
 * with the main app — only the frame and greeting are invite-specific.
 */
export default function DesktopChatPage() {
  const { createChat, chats } = useWorkspace();
  const [chatId, setChatId] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    const ob = loadOnboarding("admin");
    if (ob.name) setName(ob.name);
    try {
      const existing = localStorage.getItem(CHAT_KEY);
      if (existing && chats.some((c) => c.id === existing)) {
        setChatId(existing);
        return;
      }
      const id = createChat(ob.name ? `Welcome ${ob.name}` : "Welcome");
      localStorage.setItem(CHAT_KEY, id);
      setChatId(id);
    } catch {
      setChatId((prev) => prev ?? createChat("Welcome"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!chatId) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black" aria-busy="true">
        <span className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
      </div>
    );
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-black text-white">
      <StitchBackground />
      <div className="relative z-10">
        <AppShell
          scroll={false}
          topBar={
            <p className="ml-auto truncate text-[13px] text-white/55">
              {name ? `Welcome, ${name}. What would you like to work on?` : "Welcome. What would you like to work on?"}
            </p>
          }
        >
          <ActiveChatScreen chatId={chatId} />
        </AppShell>
      </div>
    </div>
  );
}
