"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useKeyboardViewport } from "@/lib/use-keyboard-viewport";
import {
  ArrowUp,
  Bell,
  ChevronLeft,
  MessageCircle,
  House,
  Search,
  UserRound,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileTab = "home" | "chats" | "search" | "notifications" | "profile";

const tabs: { id: MobileTab; label: string; icon: typeof House; href: string }[] = [
  { id: "home", label: "Home", icon: House, href: "/mobile" },
  { id: "chats", label: "Chats", icon: MessageCircle, href: "/mobile/chats" },
  { id: "search", label: "Search", icon: Search, href: "/mobile/search" },
  {
    id: "notifications",
    label: "Alerts",
    icon: Bell,
    href: "/mobile/notifications",
  },
  { id: "profile", label: "Profile", icon: UserRound, href: "/mobile/profile" },
];

/** Resolves the active tab for a pathname (chat detail still highlights Chats). */
export function activeTabFor(pathname: string): MobileTab {
  if (pathname === "/mobile" || pathname.startsWith("/mobile/home")) return "home";
  if (pathname.startsWith("/mobile/chats")) return "chats";
  if (pathname.startsWith("/mobile/search")) return "search";
  if (pathname.startsWith("/mobile/notifications")) return "notifications";
  if (pathname.startsWith("/mobile/profile")) return "profile";
  return "home";
}

/**
 * Floating glass top header. Transparent + heavily blurred so the aurora
 * stage glows through; rounded pill with a specular light edge.
 */
export function MobileHeader({
  title,
  backHref,
  right,
  center,
}: {
  title?: string;
  backHref?: string;
  right?: React.ReactNode;
  center?: React.ReactNode;
}) {
  return (
    <header className="mobile-chrome no-select z-30 shrink-0 px-3 pt-2">
      <div className="glass-float glass-spec glass-bloom animate-lx-drop mx-auto flex h-[56px] w-full max-w-[560px] items-center gap-1 rounded-[22px] px-2">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back"
            className="glass-icon-btn tab-item flex h-10 w-10 shrink-0"
          >
            <ChevronLeft size={21} />
          </Link>
        ) : null}

        {center !== undefined ? (
          <div className="min-w-0 flex-1">{center}</div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-1">
            <span className="truncate text-[16px] font-medium tracking-[-0.02em] text-ink">
              {title ?? "Verxa"}
            </span>
          </div>
        )}

        <div className="flex h-10 shrink-0 items-center justify-end gap-1.5">
          {right}
        </div>
      </div>
    </header>
  );
}

/** Small frosted pill used for quick actions inside glass cards. */
export function GlassPillLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-label={label} className="glass-icon-btn tab-item flex h-9 w-9">
      {children}
    </Link>
  );
}

/**
 * Floating glass bottom dock. Pill-shaped, heavily blurred, with glowing
 * active states. Sits above the safe area with liquid spacing.
 */
export function MobileTaskBar() {
  const pathname = usePathname();
  const active = activeTabFor(pathname);

  return (
    <nav
      aria-label="Main navigation"
      className="mobile-chrome no-select z-30 shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5"
    >
      <div className="glass-float glass-spec animate-lx-rise mx-auto grid w-full max-w-[560px] grid-cols-5 rounded-[24px] px-1.5 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className="tab-item flex h-[54px] flex-col items-center justify-center gap-1"
            >
              <span className="relative flex h-7 w-7 items-center justify-center">
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute -inset-1.5 rounded-full border border-white/25 bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.32),transparent_62%)] shadow-[0_0_18px_2px_var(--glow)]"
                  />
                ) : null}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.3 : 1.8}
                  className={cn(
                    "relative transition-colors duration-200",
                    isActive ? "text-ink" : "text-faint",
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-[10.5px] leading-none transition-colors duration-200",
                  isActive ? "font-medium text-ink" : "text-faint",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * The fixed app shell: floating glass header → scrolling content →
 * floating glass dock. The shell itself never scrolls; only `children`
 * scroll. This keeps the chrome stable while the keyboard opens.
 * `hideDock` removes the tab bar (used by the Gemini-style new chat screen).
 */
export function MobileShell({
  children,
  hideDock = false,
}: {
  children: React.ReactNode;
  hideDock?: boolean;
}) {
  return (
    <div className="app-shell glass-root bg-bg text-ink">
      <div aria-hidden className="glass-stage" />
      <div aria-hidden className="glass-grain" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      {hideDock ? null : <MobileTaskBar />}
    </div>
  );
}

/**
 * Slide-in navigation drawer made of frosted glass. Backdrop blurs the
 * page; the panel slides in with a liquid spring and holds every
 * navigation item.
 */
export function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="no-select fixed inset-0 z-[70]">
      <div
        className="animate-lx-veil absolute inset-0 bg-black/50 backdrop-blur-[18px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="Navigation"
        onClick={(e) => e.stopPropagation()}
        className="glass-float glass-spec glass-bloom absolute inset-y-0 left-0 flex w-[82%] max-w-[330px] flex-col rounded-r-[30px]"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 16px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)",
          animation: "lx-drawer-in 0.55s cubic-bezier(0.32, 1.45, 0.5, 1) both",
        }}
      >
        {children}
      </aside>
      <style>{`@keyframes lx-drawer-in { from { transform: translateX(-105%); filter: blur(8px); opacity: 0.4; } to { transform: translateX(0); filter: blur(0); opacity: 1; } }`}</style>
    </div>
  );
}

/** Drawer header with brand + close. */
export function DrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="no-select mb-1 flex shrink-0 items-center justify-between px-5">
      <span className="flex items-center gap-2.5">
        <span className="truncate text-[16.5px] font-medium tracking-[-0.02em] text-ink">
          Verxa <span className="font-normal text-muted">AI</span>
        </span>
      </span>
      <button
        onClick={onClose}
        aria-label="Close menu"
        className="glass-icon-btn tab-item flex h-9 w-9"
      >
        <X size={17} />
      </button>
    </div>
  );
}

/** One glass row inside the drawer. */
export function DrawerLink({
  href,
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  href: string;
  icon: typeof House;
  label: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="glass-btn tab-item mx-3 flex items-center gap-3.5 rounded-[16px] px-4 py-3"
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
          accent ? "bg-accent-soft" : "bg-white/[0.06]",
        )}
      >
        <Icon size={16} className={accent ? "text-accent" : "text-muted"} />
      </span>
      <span className={cn("text-[14.5px]", accent ? "font-medium text-ink" : "text-ink/90")}>
        {label}
      </span>
    </Link>
  );
}

/** Drawer section label. */
export function DrawerLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-6 pt-5 pb-2 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
      {children}
    </p>
  );
}

/**
 * Grok-style floating input bar: pill-shaped glass, + button, textarea,
 * send button. Keyboard-proof via VisualViewport transform (no layout jump,
 * no input hidden under the keyboard, glides with keyboard animation).
 */
export function MobileComposer({
  onSend,
  placeholder = "Message Verxa...",
  chips = [],
  showChips = false,
}: {
  onSend: (value: string) => void;
  placeholder?: string;
  /** Quick-prompt suggestion chips shown above the bar. */
  chips?: string[];
  /** Show chips only while empty (Grok-style). */
  showChips?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const kb = useKeyboardViewport();

  function submit() {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  }

  // Lift the bar above the keyboard. transform is GPU-composited, so the bar
  // glides with the keyboard animation instead of reflowing after it.
  const lifted = kb.open && kb.inset > 0;
  const dockLift = lifted ? kb.inset - 0 : 0;

  return (
    <div
      className="mobile-chrome z-40 shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-1.5"
      style={
        lifted
          ? {
              transform: `translateY(-${dockLift}px)`,
              transition: "transform 160ms var(--glass-liquid)",
            }
          : { transition: "transform 260ms var(--glass-liquid)" }
      }
    >
      {showChips && !value && chips.length > 0 && !lifted ? (
        <div className="glass-fade-x mobile-scroll-x mb-2.5 flex gap-2 overflow-x-auto pb-0.5">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onSend(chip)}
              className="glass-btn tab-item shrink-0 rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap text-ink/80"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}
      <div className="glass-float glass-spec mx-auto w-full max-w-[560px] rounded-[26px] px-2 py-2">
        <div className="flex items-end gap-1.5">
          <button
            type="button"
            aria-label="New chat"
            className="glass-icon-btn tab-item mb-0.5 flex h-10 w-10 shrink-0"
          >
            <Plus size={19} />
          </button>
          <textarea
            ref={ref}
            rows={1}
            value={value}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            spellCheck={false}
            placeholder={placeholder}
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
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send"
            className="glass-cta tab-item mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
          >
            <ArrowUp size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
