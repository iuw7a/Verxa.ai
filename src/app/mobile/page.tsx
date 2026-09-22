"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  History,
  Menu,
  MessageCircle,
  Mic,
  Plus,
  Search,
  Settings,
  Square,
  UserRound,
} from "lucide-react";
import {
  DrawerHeader,
  DrawerLabel,
  DrawerLink,
  MobileDrawer,
  MobileHeader,
  MobileShell,
} from "@/components/mobile/mobile-shell";
import { VerxaMark } from "@/components/brand/verxa-mark";
import { setMobileChatRouting } from "@/providers/workspace-provider";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { useKeyboardViewport } from "@/lib/use-keyboard-viewport";
import { greetingForHour } from "@/lib/utils";

const chips = [
  "Search the web for today's news",
  "Explain a topic simply",
  "Help me write an email",
  "Brainstorm ideas with me",
  "Summarize a long text",
];

export default function MobileHomePage() {
  const { user, profile } = useAuth();
  const { sendMessage, stopGenerating, status, streamingChatId } = useWorkspace();
  const [, setUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const kb = useKeyboardViewport();

  const generating = streamingChatId !== null && status !== "idle";
  const name = profile.displayName || user?.email?.split("@")[0] || "";

  // New chats opened from this screen should land on /mobile/chats/[id].
  useEffect(() => {
    setMobileChatRouting(true);
    return () => setMobileChatRouting(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/notifications?scope=all");
        if (!res.ok) return;
        const json = (await res.json()) as { notifications?: { id: string }[] };
        if (!cancelled) setUnread(json.notifications?.length ?? 0);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function submit() {
    const text = value.trim();
    if (!text || busy) return;
    setBusy(true);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
    void sendMessage(null, text).finally(() => setBusy(false));
  }

  // Full-screen balance: hero sits slightly above center; the flex
  // weights below (35/30/35) distribute space with no dead zones.
  const lifted = kb.open && kb.inset > 0;

  return (
    <MobileShell hideDock={lifted}>
      {/* Minimal top bar */}
      <MobileHeader
        center={
          <div className="flex items-center gap-2 pl-1">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="glass-icon-btn tab-item flex h-10 w-10 shrink-0"
            >
              <Menu size={19} />
            </button>
            <VerxaMark size={26} className="shrink-0" />
            <span className="text-[16.5px] font-medium tracking-[-0.02em] text-ink">
              Verxa
              <span className="ml-1 text-[13px] font-normal text-muted">AI</span>
            </span>
          </div>
        }
        right={
          <Link
            href="/mobile/profile"
            aria-label="Profile"
            className="glass-icon-btn tab-item flex h-10 w-10 overflow-hidden"
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-ink">
                {name ? name.slice(0, 1).toUpperCase() : <UserRound size={15} />}
              </span>
            )}
          </Link>
        }
      />

      {/* Main area: upper spacer / hero / lower spacer with chips pinned low */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div style={{ flex: lifted ? 0 : 36 }} />
        <div className="flex shrink-0 flex-col items-center px-8 text-center">
          <div className="animate-lx-rise flex flex-col items-center">
            <VerxaMark size={62} className="mb-6 opacity-95" />
            <h1
              className={`font-light tracking-[-0.04em] text-ink transition-all duration-300 ${
                lifted ? "text-[22px] leading-tight" : "text-[30px] leading-tight"
              }`}
            >
              {greetingForHour()}
            </h1>
            <p
              className={`mt-2 font-light tracking-[-0.03em] text-muted transition-all duration-300 ${
                lifted ? "text-[15px]" : "text-[19px]"
              }`}
            >
              {lifted ? "Message Verxa..." : "How can I help you?"}
            </p>
          </div>
        </div>
        <div style={{ flex: lifted ? 0 : 30 }} />
        {/* Suggestion chips live just above the composer */}
        <div className="shrink-0 px-3 pb-1">
          {!value && !lifted ? (
            <div className="glass-fade-x mobile-scroll-x flex gap-2 overflow-x-auto pb-0.5">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setValue(chip);
                    requestAnimationFrame(() => ref.current?.focus());
                  }}
                  className="glass-btn tab-item shrink-0 rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap text-ink/80"
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Floating pill composer: + / input / mic / send — keyboard-proof */}
      <div
        className="mobile-chrome z-40 shrink-0 px-3 pt-1.5"
        style={
          lifted
            ? {
                transform: `translateY(-${kb.inset}px)`,
                transition: "transform 160ms var(--glass-liquid)",
              }
            : { transition: "transform 260ms var(--glass-liquid)" }
        }
      >
        <div className="glass-float glass-spec mx-auto w-full max-w-[560px] rounded-[28px] px-2 py-2">
          <div className="flex items-end gap-1">
            <Link
              href="/mobile/chats?new=1"
              aria-label="New chat"
              className="glass-icon-btn tab-item mb-0.5 flex h-10 w-10 shrink-0"
            >
              <Plus size={19} />
            </Link>
            <textarea
              ref={ref}
              rows={1}
              value={value}
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="on"
              spellCheck={false}
              placeholder="Message Verxa..."
              onFocus={() => {
                requestAnimationFrame(() => {
                  ref.current?.scrollIntoView({ block: "end", behavior: "smooth" });
                });
              }}
              onChange={(e) => {
                setValue(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="max-h-[120px] min-h-[40px] w-full min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-[16px] leading-6 text-ink outline-none placeholder:text-faint"
            />
            {generating ? (
              <button
                type="button"
                onClick={stopGenerating}
                aria-label="Stop"
                className="glass-btn tab-item mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              >
                <Square size={11} fill="currentColor" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Voice input"
                  className="glass-icon-btn tab-item mb-0.5 flex h-10 w-10 shrink-0"
                >
                  <Mic size={18} />
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!value.trim()}
                  aria-label="Send"
                  className="glass-cta tab-item mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
                >
                  <ArrowUp size={18} strokeWidth={2.4} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <DrawerHeader onClose={() => setDrawerOpen(false)} />
        <DrawerLabel>Navigation</DrawerLabel>
        <DrawerLink href="/mobile" icon={MessageCircle} label="Chats" onClick={() => setDrawerOpen(false)} accent />
        <DrawerLink href="/mobile/search" icon={Search} label="Search" onClick={() => setDrawerOpen(false)} />
        <DrawerLink href="/mobile/chats" icon={History} label="Recent" onClick={() => setDrawerOpen(false)} />
        <DrawerLabel>Account</DrawerLabel>
        <DrawerLink href="/mobile/profile" icon={UserRound} label="Profile" onClick={() => setDrawerOpen(false)} />
        <DrawerLink href="/mobile/profile/settings" icon={Settings} label="Settings" onClick={() => setDrawerOpen(false)} />
      </MobileDrawer>
    </MobileShell>
  );
}
