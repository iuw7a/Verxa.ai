"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { readActiveChat, writeActiveChat } from "@/lib/ai/prefs";

/**
 * Gemini-inspired mobile shell for /ai — top bar, left drawer, bottom-pill composer area.
 * Inspired ONLY by layout/spacing/navigation of the screenshots; all copy, branding,
 * and module destinations are original Verxa AI.
 */
export function AiShell({
  title,
  subtitle,
  children,
  hideHeaderSubtitle,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  hideHeaderSubtitle?: boolean;
}) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const { aiChats } = useWorkspace();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const initial = (profile.displayName || user?.email || "?").slice(0, 1).toUpperCase();
  const name = profile.displayName || user?.email?.split("@")[0] || "Gast";

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent body scroll when overlay open
  useEffect(() => {
    if (drawerOpen || settingsOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [drawerOpen, settingsOpen]);

  const topTitle = title ?? "Verxa AI";

  return (
    <div
      className="mx-auto flex h-dvh w-full max-w-md flex-col bg-black text-white"
      style={{
        background:
          "radial-gradient(120% 65% at 50% 100%, rgba(42,64,130,0.55) 0%, rgba(10,16,40,0.45) 42%, rgba(0,0,0,1) 78%), #000",
      }}
    >
      {/* Top bar — exakt wie Screenshot 1 */}
      <header className="flex shrink-0 items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),10px)] pb-2.5">
        <button
          aria-label="Menü öffnen"
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.09] text-white active:bg-white/15"
        >
          <span className="flex flex-col gap-1.5">
            <span className="block h-[1.5px] w-4 bg-white/85" />
            <span className="block h-[1.5px] w-4 bg-white/85" />
          </span>
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-1 truncate text-[15px] font-medium tracking-tight text-white/90">
            Flash{" "}
            <span className="font-normal text-white/55">Erweitert</span>
            <span className="ml-0.5 text-[11px] text-white/40">▾</span>
          </span>
        </button>

        <Link
          href="/ai/voice"
          aria-label="Voice"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.09] text-white active:bg-white/15"
        >
          <span className="relative flex h-5 w-5 items-center justify-center">
            {/* magic wand dotted */}
            <span className="absolute h-5 w-5 rounded-full border border-dashed border-white/45" />
            <span className="text-[11px]">✦</span>
          </span>
        </Link>

        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white"
          style={{ background: "#d12b6b" }}
          title={user?.email ?? "Gast"}
        >
          {user ? initial : "?"}
        </div>
      </header>

      {/* Content */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>

      {/* Drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
          <button
            aria-label="Schließen"
            className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative flex w-[86%] max-w-[320px] shrink-0 flex-col bg-[#0b0c0f] shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),16px)] pb-3">
              <span className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/verxa-logo.png"
                  alt="Verxa"
                  className="h-6 w-auto object-contain brightness-[1.05]"
                />
                <span className="text-[16px] font-semibold tracking-tight">Verxa AI</span>
              </span>
              <button
                aria-label="Schließen"
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/70 active:bg-white/15"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {/* Neuer Chat */}
              <Link
                href="/ai"
                onClick={() => {
                  writeActiveChat(null);
                  setDrawerOpen(false);
                }}
                className="flex min-h-[48px] items-center gap-3 rounded-full bg-[#2a2e39] px-4 text-[14px] font-medium text-white active:bg-[#343a4d]"
              >
                <PencilIcon />
                Neuer Chat
              </Link>

              {/* Primary modules — map Gemini labels to Verxa modules */}
              <nav className="mt-3 space-y-0.5">
                <DrawerLink
                  href="/ai/history"
                  icon={<SearchIcon />}
                  label="Chats durchsuchen"
                  active={pathname === "/ai/history"}
                />
                <DrawerLink
                  href="/ai/image"
                  icon={<ImageIcon />}
                  label="Bilder"
                  active={pathname === "/ai/image"}
                />
                <DrawerLink
                  href="/ai/files"
                  icon={<GridIcon />}
                  label="Mediathek"
                  active={pathname === "/ai/files"}
                />
              </nav>

              <p className="mt-6 px-3 text-[11px] font-medium tracking-wide text-white/35 uppercase">
                Verxa Module
              </p>
              <nav className="mt-2 space-y-0.5">
                <DrawerLink
                  href="/ai/voice"
                  icon={<MicIcon />}
                  label="Voice"
                  active={pathname === "/ai/voice"}
                />
                <DrawerLink
                  href="/ai/memory"
                  icon={<BrainIcon />}
                  label="Memory"
                  active={pathname === "/ai/memory"}
                />
                <DrawerLink
                  href="/ai/files"
                  icon={<FolderIcon />}
                  label="Dateien"
                  active={false}
                />
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    setSettingsOpen(true);
                  }}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] ${
                    pathname === "/ai/settings" ? "bg-white/[0.07] text-white" : "text-white/85"
                  }`}
                >
                  <SettingsIcon />
                  Einstellungen
                </button>
              </nav>

              <p className="mt-6 px-3 text-[11px] font-medium tracking-wide text-white/35 uppercase">
                Letzte Unterhaltungen
              </p>
              <div className="mt-2 space-y-0.5">
                {aiChats.length === 0 ? (
                  <p className="px-3 py-2 text-[12px] text-white/30">
                    Noch keine Chats — starte oben einen neuen Chat.
                  </p>
                ) : (
                  aiChats.slice(0, 18).map((c) => (
                    <Link
                      key={c.id}
                      href={`/ai/chat/${c.id}`}
                      onClick={() => {
                        writeActiveChat(c.id);
                        setDrawerOpen(false);
                      }}
                      className="flex min-h-[44px] items-center rounded-xl px-3 text-[13.5px] leading-5 text-white/80 hover:bg-white/[0.06] active:bg-white/[0.08]"
                    >
                      <span className="truncate">{c.title}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Drawer footer */}
            <div className="flex items-center gap-3 border-t border-white/10 px-3 py-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                style={{ background: "#d12b6b" }}
              >
                {initial}
              </div>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                {name}
              </span>
              <Link
                href="/ai/settings"
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/60 active:bg-white/15"
                aria-label="Einstellungen"
              >
                <GearIcon />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Settings bottom sheet — exakt wie Screenshot 4 & 6 */}
      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
          <button
            aria-label="Schließen"
            className="absolute inset-0 bg-black/60"
            onClick={() => setSettingsOpen(false)}
          />
          <div
            className="relative max-h-[86vh] overflow-y-auto rounded-t-[28px] bg-[#1c1e24] px-4 pt-3 pb-[max(env(safe-area-inset-bottom),14px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex flex-col items-center bg-[#1c1e24] pb-2">
              <div className="h-1 w-10 rounded-full bg-white/20" />
              <div className="mt-3 flex w-full items-center justify-between">
                <h2 className="text-[19px] font-semibold tracking-tight">Verxa-Einstellungen</h2>
                <button
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Schließen"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                  style={{ background: "#2a7bff" }}
                >
                  ✓
                </button>
              </div>
            </div>

            <section className="mt-2 overflow-hidden rounded-[20px] bg-[#2a2d36]">
              <SheetRow icon={<StarIcon />} label="Auf Verxa Plus upgraden" />
              <SheetRow icon={<ClockIcon />} label="Nutzungslimits" href="/ai/settings" />
            </section>

            <p className="mt-5 px-1 text-[12px] font-medium text-white/45">Preferences</p>
            <section className="mt-2 overflow-hidden rounded-[20px] bg-[#2a2d36]">
              <SheetRow icon={<BellIcon />} label="Benachrichtigungen" />
              <SheetRow icon={<UserPlusIcon />} label="Persönlicher Kontext" href="/ai/memory" onClick={() => setSettingsOpen(false)} />
              <SheetRow icon={<FaceIcon />} label="Avatar" href="/ai/settings" />
              <SheetRow icon={<WaveIcon />} label="Voice" href="/ai/voice" onClick={() => setSettingsOpen(false)} />
              <SheetRow icon={<AgentIcon />} label="Agents and Automation" href="/ai/settings" />
            </section>

            <p className="mt-5 px-1 text-[12px] font-medium text-white/45">Data & privacy</p>
            <section className="mt-2 overflow-hidden rounded-[20px] bg-[#2a2d36]">
              <SheetRow icon={<ActivityIcon />} label="Aktivitäten in Verxa-Apps" href="/ai/history" />
              <SheetRow icon={<LinkIcon />} label="Public links" href="/ai/files" />
              <SheetRow icon={<PrivacyIcon />} label="Privacy" href="/ai/settings" />
            </section>

            <p className="mt-5 px-1 text-[12px] font-medium text-white/45">Get support</p>
            <section className="mt-2 overflow-hidden rounded-[20px] bg-[#2a2d36]">
              <SheetRow icon={<HelpIcon />} label="Hilfe" />
              <SheetRow icon={<FlagIcon />} label="Problem melden" />
              <SheetRow icon={<InfoIcon />} label="About" href="/ai/settings" />
            </section>

            {/* Account row inside sheet */}
            <section className="mt-4 overflow-hidden rounded-[20px] bg-[#2a2d36]">
              <div className="flex items-center gap-3 px-4 py-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                  style={{ background: "#d12b6b" }}
                >
                  {initial}
                </div>
                <span className="flex-1 truncate text-[14px] font-medium">{user?.email ?? "Gast"}</span>
                <Link
                  href="/ai/settings"
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-full bg-[#2a7bff] px-4 py-2 text-[13px] font-medium text-white"
                >
                  Konto
                </Link>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DrawerLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[14px] ${
        active ? "bg-white/[0.07] text-white" : "text-white/85 active:bg-white/[0.05]"
      }`}
    >
      <span className="text-white/55">{icon}</span>
      {label}
    </Link>
  );
}

function SheetRow({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex min-h-[52px] items-center gap-3 px-4 py-3 active:bg-white/[0.04]">
      <span className="text-white/55">{icon}</span>
      <span className="flex-1 text-[15px]">{label}</span>
      <span className="text-white/25">›</span>
    </div>
  );
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      {href ? (
        <Link href={href} onClick={onClick} className="block">
          {content}
        </Link>
      ) : (
        <button onClick={onClick} className="block w-full text-left">
          {content}
        </button>
      )}
    </div>
  );
}

/* ── tiny inline icons (no extra deps) ── */
function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 20H21M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L3 19" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" />
    </svg>
  );
}
function BrainIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M9 3a3 3 0 00-3 3v1a3 3 0 000 6v1a3 3 0 003 3M15 3a3 3 0 013 3v1a3 3 0 010 6v1a3 3 0 01-3 3" />
      <path d="M9 9h6M9 13h6" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06A1.65 1.65 0 0015 19.4a1.65 1.65 0 00-1 .6 1.65 1.65 0 01-2 0 1.65 1.65 0 00-1-.6 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-.6-1 1.65 1.65 0 010-2c.2-.36.48-.68.6-1A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82L4.21 7.12A2 2 0 017.04 4.29l.06.06A1.65 1.65 0 008.9 4.6c.36 0 .7.2 1 .6a1.65 1.65 0 012 0c.3-.4.64-.6 1-.6a1.65 1.65 0 001.82-.33l.06-.06A2 2 0 0119.71 7.12l-.06.06A1.65 1.65 0 0019.4 9c0 .36-.2.7-.6 1a1.65 1.65 0 010 2c.4.3.6.64.6 1z" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 5.2L20 10l-5.6 2.8L12 18l-2.4-5.2L4 10l5.6-2.8z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 8a6 6 0 0112 0c0 7-6 11-6 11S6 15 6 8z" />
      <path d="M10 20a2 2 0 004 0" />
    </svg>
  );
}
function UserPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11H16" />
    </svg>
  );
}
function FaceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
    </svg>
  );
}
function WaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="7" width="4" height="10" rx="2" />
      <path d="M10 10v4M14 9v6M18 7v10" />
    </svg>
  );
}
function AgentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function ActivityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="8" />
      <path d="M3 12a9 9 0 0113.5-7.8" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M10 13a5 5 0 007.54.54l2-2a5 5 0 00-7.07-7.07l-1.5 1.5M14 11a5 5 0 00-7.54-.54l-2 2a5 5 0 007.07 7.07l1.5-1.5" />
    </svg>
  );
}
function PrivacyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
      <path d="M9.09 9a3 3 0 015.82 1c0 2-3 2-3 4M12 17h.01" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 15s1-1 4-3 6-6 8-6v12s-3 1-6 3-4 2-6 2V3" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
