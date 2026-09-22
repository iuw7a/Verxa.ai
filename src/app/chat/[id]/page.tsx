"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ActiveChatScreen } from "@/components/layout/active-chat-screen";
import { ModelPicker } from "@/components/chat/model-picker";
import { StitchBackground } from "@/components/stitch/stitch-background";
import { useWorkspace } from "@/providers/workspace-provider";

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const { getChatModel, setChatModel } = useWorkspace();
  const chatId = params.id;

  return (
    <div className="relative h-dvh overflow-hidden bg-black text-white">
      <StitchBackground />
      <div className="relative z-10">
        <AppShell
          scroll={false}
          topBar={
            <div className="ml-auto">
              <ModelPicker
                modelId={getChatModel(chatId)}
                onSelect={(id) => setChatModel(chatId, id)}
              />
            </div>
          }
        >
          <ActiveChatScreen chatId={chatId} />
        </AppShell>
      </div>
    </div>
  );
}
