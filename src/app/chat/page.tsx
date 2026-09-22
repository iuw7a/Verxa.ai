"use client";

import { NewChatScreen } from "@/components/chat/new-chat-screen";
import { ModelPicker } from "@/components/chat/model-picker";
import { AppShell } from "@/components/layout/app-shell";
import { StitchBackground } from "@/components/stitch/stitch-background";
import { useWorkspace } from "@/providers/workspace-provider";

export default function ChatHomePage() {
  const { selectedModelId, setDefaultModel } = useWorkspace();

  return (
    <div className="relative h-dvh overflow-hidden bg-black text-white">
      <StitchBackground />
      <div className="relative z-10">
        <AppShell
          scroll={false}
          topBar={
            <div className="ml-auto">
              <ModelPicker
                modelId={selectedModelId}
                onSelect={setDefaultModel}
              />
            </div>
          }
        >
          <NewChatScreen />
        </AppShell>
      </div>
    </div>
  );
}
