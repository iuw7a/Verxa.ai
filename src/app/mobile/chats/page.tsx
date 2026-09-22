"use client";

import Link from "next/link";
import { SquarePen } from "lucide-react";
import { MobileHeader, MobileShell } from "@/components/mobile/mobile-shell";
import { MobileChatList } from "@/components/mobile/mobile-screens";
import { useWorkspace } from "@/providers/workspace-provider";

export default function MobileChatsPage() {
  const { chats } = useWorkspace();
  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <MobileShell>
      <MobileHeader
        title="Chats"
        right={
          <Link
            href="/mobile/chats?new=1"
            aria-label="New chat"
            className="glass-icon-btn tab-item flex h-10 w-10 text-accent"
          >
            <SquarePen size={18} />
          </Link>
        }
      />
      <div className="mobile-scroll glass-fade-y min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[560px] px-4 py-4">
          <MobileChatList chats={sorted} />
        </div>
      </div>
    </MobileShell>
  );
}
