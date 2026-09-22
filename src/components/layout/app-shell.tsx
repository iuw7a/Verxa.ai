"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/sidebar/app-frame";
import { useWorkspace } from "@/providers/workspace-provider";

export function AppShell({
  children,
  topBar,
  scroll = true,
}: {
  children: React.ReactNode;
  topBar?: React.ReactNode;
  /** false = children manage their own scrolling (chat screens). */
  scroll?: boolean;
}) {
  const router = useRouter();
  const { stopGenerating } = useWorkspace();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        router.push("/chat");
      }
      if (e.key === "Escape") stopGenerating();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, stopGenerating]);

  return (
    <AppFrame topBar={topBar} scroll={scroll}>
      <main
        className={
          scroll
            ? "mx-auto flex min-h-full w-full max-w-[900px] flex-col px-4 pb-4 sm:px-8 lg:px-6"
            : "mx-auto flex h-full min-h-0 w-full max-w-[900px] flex-col px-4 pb-4 sm:px-8 lg:px-6"
        }
      >
        {children}</main>
    </AppFrame>
  );
}
