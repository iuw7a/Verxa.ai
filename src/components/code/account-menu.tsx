"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  HelpCircle,
  Home,
  Inbox,
  LifeBuoy,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Monitor,
  User,
  X,
  FileText,
  Users,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { VerxaMark } from "@/components/brand/verxa-mark";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  created_at: string;
  seen: boolean;
};

export function AccountMenu({
  className,
  placement = "bottom-left",
}: {
  className?: string;
  placement?: "bottom-left" | "top-right" | "inline";
}) {
  const { user, profile, setAuthOpen } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const signedIn = Boolean(user);
  const displayName =
    profile.displayName || profile.username || user?.email?.split("@")[0] || "Guest";
  const userEmail = user?.email || "guest@verxa.de";
  const avatarUrl = profile.avatarUrl;

  // Poll notifications only if signed in
  const fetchNotifications = useCallback(async () => {
    if (!signedIn) return;
    try {
      setLoadingNotifications(true);
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { notifications?: Notification[] };
        if (Array.isArray(json.notifications)) {
          setNotifications(json.notifications);
        }
      }
    } catch {
      // Best effort
    } finally {
      setLoadingNotifications(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    void fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 60000);
    return () => window.clearInterval(interval);
  }, [signedIn, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.seen).length;

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setAppearanceOpen(false);
    setInboxOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuOpen && !inboxOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAll();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, inboxOpen, closeAll]);

  // Focus trap / Arrow navigation inside menu
  function handleMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeAll();
      return;
    }
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        "[role='menuitem'], button, a",
      ) ?? [],
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

    if (!items.length) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  function handleSignOut() {
    closeAll();
    router.push("/logout");
  }

  async function markNotificationSeen(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, seen: true } : n)),
    );
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Best effort
    }
  }

  const themeOptions: { value: "system" | "light" | "dark"; label: string; icon: typeof Sun }[] =
    [
      { value: "system", label: "System", icon: Monitor },
      { value: "light", label: "Hell", icon: Sun },
      { value: "dark", label: "Dunkel", icon: Moon },
    ];

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      {/* Trigger Button: User avatar / profile button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setMenuOpen((prev) => !prev);
          setAppearanceOpen(false);
          setInboxOpen(false);
        }}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="User account menu"
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all duration-200",
          "hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ea4ff]/50",
          menuOpen ? "bg-white/[0.08]" : "bg-transparent",
        )}
      >
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#14171f] text-[13px] font-semibold text-white shadow-inner">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(displayName)
            )}
          </div>
          {unreadCount > 0 ? (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-[#08090c]"
              aria-label={`${unreadCount} ungelesene Benachrichtigungen`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium text-white group-hover:text-[#8ea4ff] transition-colors">
              {displayName}
            </span>
            <span className="rounded bg-[#8ea4ff]/15 px-1 py-0.2 text-[9.5px] font-medium tracking-wide text-[#8ea4ff]">
              {signedIn ? "PRO" : "GUEST"}
            </span>
          </div>
          <span className="block truncate text-[11.5px] text-white/45">
            {userEmail}
          </span>
        </div>
      </button>

      {/* Main Account Dropdown Menu */}
      {menuOpen ? (
        <div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            "absolute z-50 w-[290px] overflow-hidden rounded-2xl border border-white/12 bg-[#0c0e14]/98 p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-200 animate-in fade-in zoom-in-95",
            placement === "bottom-left" && "bottom-full left-0 mb-2",
            placement === "top-right" && "top-full right-0 mt-2",
            placement === "inline" && "bottom-14 left-0",
          )}
        >
          {/* Header Branding & Profile Info */}
          <div className="border-b border-white/[0.08] px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <VerxaMark size={18} />
                <span className="text-[13px] font-semibold tracking-tight text-white">
                  Verxa <span className="text-[#8ea4ff]">Code</span>
                </span>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-white/50">
                v2.4
              </span>
            </div>

            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-2 border border-white/[0.05]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1b202c] text-[12px] font-semibold text-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  initials(displayName)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-white">{displayName}</p>
                <p className="truncate text-[11px] text-white/45">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Menu Items List */}
          <div className="py-1 space-y-0.5">
            {/* 1. Profil */}
            <Link
              href="/account/profile"
              role="menuitem"
              onClick={closeAll}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <User size={15} className="text-white/50" />
              <span>Profil</span>
            </Link>

            {/* 2. Posteingang */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setInboxOpen(true);
                setAppearanceOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <Inbox size={15} className="text-white/50" />
                <span>Posteingang</span>
              </span>
              {unreadCount > 0 ? (
                <span className="flex h-5 items-center rounded-full bg-red-500/20 px-1.5 text-[10.5px] font-semibold text-red-400">
                  {unreadCount}
                </span>
              ) : (
                <span className="text-[11px] text-white/30">0 neu</span>
              )}
            </button>

            {/* 3. Einstellungen */}
            <Link
              href="/account/settings"
              role="menuitem"
              onClick={closeAll}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Settings size={15} className="text-white/50" />
              <span>Einstellungen</span>
            </Link>

            {/* 4. Erscheinungsbild */}
            <div className="relative">
              <button
                type="button"
                role="menuitem"
                onClick={() => setAppearanceOpen((prev) => !prev)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white",
                  appearanceOpen && "bg-white/[0.06] text-white",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Sun size={15} className="text-white/50" />
                  <span>Erscheinungsbild</span>
                </span>
                <span className="flex items-center gap-1 text-[11.5px] text-white/40">
                  {theme === "dark" ? "Dunkel" : theme === "light" ? "Hell" : "System"}
                  <ChevronRight size={13} className={cn("transition-transform", appearanceOpen && "rotate-90")} />
                </span>
              </button>

              {/* Appearance Submenu */}
              {appearanceOpen ? (
                <div className="my-1 mx-1.5 space-y-0.5 rounded-xl border border-white/10 bg-black/50 p-1">
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const active = theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setTheme(opt.value);
                          // Keep open for instant feedback or close after brief delay
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors",
                          active
                            ? "bg-[#8ea4ff]/15 text-[#8ea4ff] font-medium"
                            : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon size={14} />
                          {opt.label}
                        </span>
                        {active ? <Check size={13} strokeWidth={2.5} /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="my-1.5 h-px bg-white/[0.07]" />

            {/* 5. Support */}
            <Link
              href="/support"
              role="menuitem"
              onClick={closeAll}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <LifeBuoy size={15} className="text-white/50" />
              <span>Support</span>
            </Link>

            {/* 6. Dokumentation */}
            <Link
              href="/docs/api"
              role="menuitem"
              onClick={closeAll}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <FileText size={15} className="text-white/50" />
              <span>Dokumentation</span>
            </Link>

            {/* 7. Community */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={closeAll}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <Users size={15} className="text-white/50" />
                <span>Community</span>
              </span>
              <ExternalLink size={12} className="text-white/30" />
            </a>

            {/* 8. Apps herunterladen */}
            <Link
              href="/downloads"
              role="menuitem"
              onClick={closeAll}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Download size={15} className="text-white/50" />
              <span>Apps herunterladen</span>
            </Link>

            {/* 9. Startseite */}
            <Link
              href="/code"
              role="menuitem"
              onClick={closeAll}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Home size={15} className="text-white/50" />
              <span>Startseite</span>
            </Link>

            <div className="my-1.5 h-px bg-white/[0.07]" />

            {/* 10. Abmelden */}
            {signedIn ? (
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-red-400/90 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut size={15} />
                <span>Abmelden</span>
              </button>
            ) : (
              <Link
                href="/login?next=%2Fcode"
                role="menuitem"
                onClick={closeAll}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8ea4ff] px-3 py-2 text-[13px] font-medium text-black transition-colors hover:bg-[#b8c5ff]"
              >
                Anmelden
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {/* Posteingang / Inbox Modal */}
      {inboxOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/12 bg-[#101217] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Inbox size={18} className="text-[#8ea4ff]" />
                <h3 className="text-[15px] font-semibold text-white">Posteingang</h3>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-400">
                    {unreadCount} neu
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setInboxOpen(false)}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Close inbox"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto p-3 space-y-2">
              {loadingNotifications ? (
                <div className="py-12 text-center text-[13px] text-white/40">
                  Lade Nachrichten…
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-white/40">
                  Keine Nachrichten vorhanden. Dein Posteingang ist leer.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "group relative rounded-xl border p-3.5 transition",
                      n.seen
                        ? "border-white/[0.06] bg-white/[0.02] text-white/60"
                        : "border-[#8ea4ff]/30 bg-[#8ea4ff]/[0.04] text-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{n.title}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-white/65">
                          {n.body}
                        </p>
                        <span className="mt-2 block text-[10.5px] text-white/35">
                          {new Date(n.created_at).toLocaleDateString("de-DE", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {!n.seen ? (
                        <button
                          type="button"
                          onClick={() => void markNotificationSeen(n.id)}
                          className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          Als gelesen
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/10 bg-white/[0.02] px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setInboxOpen(false)}
                className="rounded-xl bg-white/10 px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-white/15"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
