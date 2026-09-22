"use client";

import { MobileHeader, MobileShell } from "@/components/mobile/mobile-shell";
import { MobileChatSearch } from "@/components/mobile/mobile-screens";
import { useWorkspace } from "@/providers/workspace-provider";

export default function MobileSearchPage() {
  const { chats } = useWorkspace();

  return (
    <MobileShell>
      <MobileHeader title="Search" />
      <MobileChatSearch chats={chats} />
    </MobileShell>
  );
}
