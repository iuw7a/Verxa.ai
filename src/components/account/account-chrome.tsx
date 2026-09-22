"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/settings", label: "Settings" },
  { href: "/account/security", label: "Security" },
  { href: "/account/memory", label: "Memory" },
  { href: "/account/personalization", label: "Personalization" },
  { href: "/account/connected-apps", label: "Connected Apps" },
  { href: "/api-keys", label: "API Keys" },
  { href: "/account/subscription", label: "Subscription" },
  { href: "/account/help", label: "Help" },
];

export function AccountChrome({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <AppShell
      topBar={
        <div className="flex w-full items-center justify-between">
          <div>
            <p className="text-[11px] tracking-[0.14em] text-faint uppercase">
              Account
            </p>
            <h1 className="text-[15px] font-medium tracking-[-0.02em]">
              {title}
            </h1>
          </div>
        </div>
      }
    >
      {/* Horizontal scrollable section nav on phones, sidebar on desktop */}
      <div
        className="mobile-scroll-x mx-auto flex w-full max-w-[980px] gap-1.5 overflow-x-auto px-4 pt-4 pb-1 md:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-[13px] whitespace-nowrap",
              pathname === item.href
                ? "border-accent/40 bg-accent-soft text-ink"
                : "border-line text-muted",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-[980px] gap-10 px-4 py-6 sm:px-8 md:py-10">
        <nav className="hidden w-[180px] shrink-0 md:block">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-[10px] px-3 py-2 text-[13.5px]",
                pathname === item.href
                  ? "bg-white/[0.05] text-ink"
                  : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1 pb-16">
          <h2 className="text-[28px] font-light tracking-[-0.045em]">{title}</h2>
          <p className="mt-2 max-w-[520px] text-[14.5px] leading-7 text-muted">
            {description}
          </p>
          <div className="mt-8 space-y-5">{children}</div>
        </div>
      </div>
    </AppShell>
  );
}
