"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  BookOpenText,
  ChevronRight,
  Globe,
  Info,
  KeyRound,
  LifeBuoy,
  LogOut,
  Shield,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { MobileHeader, MobileShell } from "@/components/mobile/mobile-shell";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { initials } from "@/lib/utils";

const settingsLinks = [
  {
    href: "/mobile/profile/settings",
    label: "Settings",
    description: "Appearance, language, notifications",
    icon: SlidersHorizontal,
  },
  {
    href: "/mobile/profile/security",
    label: "Security",
    description: "Password, sessions, 2FA",
    icon: KeyRound,
  },
  {
    href: "/mobile/profile/personalization",
    label: "AI personalization",
    description: "Tone, length, custom instructions",
    icon: UserRound,
  },
  {
    href: "/mobile/profile/memory",
    label: "Memory",
    description: "What Verxa remembers about you",
    icon: BookOpenText,
  },
  {
    href: "/mobile/profile/support",
    label: "Help & support",
    description: "FAQs and contact",
    icon: LifeBuoy,
  },
  {
    href: "/about",
    label: "About Verxa",
    description: "Version, company, links",
    icon: Info,
  },
];

export default function MobileProfilePage() {
  const router = useRouter();
  const { user, profile, setAuthOpen } = useAuth();
  const { chats, memories } = useWorkspace();
  const [confirmOut, setConfirmOut] = useState(false);

  const name = profile.displayName || user?.email?.split("@")[0] || "Guest";

  return (
    <MobileShell>
      <MobileHeader title="Profile" />
      <div className="mobile-scroll glass-fade-y min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[560px] px-4 py-4">
          {/* Identity glass card */}
          <section className="glass glass-spec glass-bloom animate-lx-rise relative overflow-hidden rounded-[24px] p-5">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-accent-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_22px_-4px_var(--glow)]">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[18px] font-medium text-ink">
                    {initials(name)}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[19px] font-medium tracking-[-0.02em] text-ink">
                  {name}
                </p>
                <p className="truncate text-[13px] text-muted">
                  {user?.email ?? "Guest — sign in to sync"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[15px] border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2.5">
                <Globe size={15} className="text-muted" />
                <span className="text-[13.5px] text-muted">
                  {chats.length} chat{chats.length === 1 ? "" : "s"} ·{" "}
                  {memories.length} memor
                  {memories.length === 1 ? "y" : "ies"}
                </span>
              </div>
              {user ? (
                <span className="rounded-full border border-white/15 bg-accent-soft px-2.5 py-1 text-[11px] font-medium tracking-wide text-accent uppercase">
                  Signed in
                </span>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="glass-cta tab-item rounded-full px-3.5 py-1.5 text-[12.5px] font-medium"
                >
                  Sign in
                </button>
              )}
            </div>
          </section>

          {/* Link sections */}
          <div className="mt-4 space-y-2">
            {settingsLinks.map((item, i) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="glass glass-btn animate-lx-rise tab-item flex items-center gap-3.5 rounded-[18px] px-4 py-3.5"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <Icon size={15} className="text-muted" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] text-ink">
                      {item.label}
                    </span>
                    <span className="block truncate text-[12.5px] text-faint">
                      {item.description}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-faint" />
                </Link>
              );
            })}
          </div>

          {/* Admin shortcut (middleware already guards /mobile itself) */}
          {user ? (
            <Link
              href="/admin"
              className="glass glass-btn tab-item mt-2 flex items-center gap-3.5 rounded-[18px] px-4 py-3.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/15 bg-accent-soft">
                <Shield size={15} className="text-accent" />
              </span>
              <span className="flex-1 text-[14.5px] text-ink">
                Admin dashboard
              </span>
              <ChevronRight size={16} className="shrink-0 text-faint" />
            </Link>
          ) : null}

          {/* Account actions */}
          <div className="glass glass-spec mt-2 overflow-hidden rounded-[18px]">
            {user ? (
              <button
                onClick={() => setConfirmOut((v) => !v)}
                className="tab-item flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.06]">
                  <LogOut size={15} className="text-muted" />
                </span>
                <span className="flex-1 text-[14.5px] text-danger">Log out</span>
              </button>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="tab-item flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.06]">
                  <Bell size={15} className="text-muted" />
                </span>
                <span className="flex-1 text-[14.5px] text-accent">
                  Sign in to sync your data
                </span>
              </button>
            )}
            {confirmOut ? (
              <div className="flex gap-2 border-t border-white/10 px-4 py-3">
                <button
                  onClick={() => {
                    setConfirmOut(false);
                    router.push("/logout");
                  }}
                  className="tab-item flex-1 rounded-[12px] border border-white/10 bg-[rgba(240,113,120,0.12)] py-2.5 text-[13.5px] font-medium text-danger"
                >
                  Confirm log out
                </button>
                <button
                  onClick={() => setConfirmOut(false)}
                  className="glass-btn tab-item flex-1 rounded-[12px] py-2.5 text-[13.5px] text-muted"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>

          <p className="mt-6 text-center text-[11.5px] text-faint">
            Verxa AI · Berlin
          </p>
        </div>
      </div>
    </MobileShell>
  );
}
