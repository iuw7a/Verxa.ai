"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { VerxaWordmark } from "@/components/brand/verxa-mark";

/**
 * Responsive frame around the app: fixed sidebar ≥1024px, overlay drawer
 * below. Desktop rendering is byte-identical to the previous AppShell; only
 * phones get the drawer.
 *
 * `scroll={false}` turns the outer <main> into a fixed-height container for
 * pages that manage their own internal scrolling (the chat screens). Without
 * it, long conversations grow the page and push the composer off-position.
 */
export function AppFrame({
  children,
  topBar,
  scroll = true,
}: {
  children: React.ReactNode;
  topBar?: React.ReactNode;
  scroll?: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on navigation.
  useEffect(() => {
    const onPop = () => setDrawerOpen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Close on any internal link click inside the drawer.
  function closeOnNavigate(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest("a");
    if (target) setDrawerOpen(false);
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-transparent text-ink">
      {/* Desktop sidebar — unchanged behavior */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="animate-rise absolute inset-y-0 left-0 w-[290px] max-w-[86vw] shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div onClick={closeOnNavigate} className="h-full">
              <Sidebar />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Mobile top bar with hamburger (desktop uses the passed topBar) */}
        <div className="flex shrink-0 items-center gap-1 border-b border-line bg-black/20 px-2 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted"
          >
            <Menu size={21} />
          </button>
          <div className="min-w-0 flex-1 pb-1.5 pt-1.5">
            <VerxaWordmark compact />
          </div>
          {topBar ? (
            <div className="flex shrink-0 items-center pr-2">{topBar}</div>
          ) : null}
        </div>

        {/* Desktop top bar */}
        {topBar ? (
          <header className="hidden h-14 shrink-0 items-center border-b border-line px-6 lg:flex">
            {topBar}
          </header>
        ) : null}

        <main
          className={
            scroll
              ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
              : "min-h-0 flex-1 overflow-hidden"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
