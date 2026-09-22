"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  FolderKanban,
  LogOut,
  MoreHorizontal,
  Pencil,
  Puzzle,
  Search,
  Settings,
  SquarePen,
  Trash2,
  Sparkles,
} from "lucide-react";
import { VerxaWordmark } from "@/components/brand/verxa-mark";
import { cn, formatRelativeTime, initials } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";

const comingSoon = [
  { href: "/follow", label: "Chat Follow", icon: Sparkles },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/code", label: "Code", icon: Code2 },
  { href: "/plugins", label: "Plugins", icon: Puzzle },
];

const accountLinks = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/settings", label: "Account Settings" },
  { href: "/account/security", label: "Security" },
  { href: "/account/memory", label: "Memory" },
  { href: "/account/personalization", label: "Personalization" },
  { href: "/account/connected-apps", label: "Connected Apps" },
  { href: "/account/subscription", label: "Subscription" },
  { href: "/account/help", label: "Help & Feedback" },
];

const adminEmails = ["admin@verxta.de"];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { chats, renameChat, deleteChat } = useWorkspace();
  const { profile, user, setAuthOpen } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openChatMenu, setOpenChatMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const name = profile.displayName || user?.email?.split("@")[0] || "Guest";

  const isNewChat = pathname === "/chat";
  const isStudio = pathname.startsWith("/studio");
  const activeChatId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2]
    : null;

  const sorted = useMemo(
    () => [...chats].sort((a, b) => b.updatedAt - a.updatedAt),
    [chats],
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <aside className="flex h-dvh w-[272px] shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="px-4 pt-5 pb-3">
        <Link href="/" className="inline-flex">
          <VerxaWordmark />
        </Link>
      </div>

      <div className="space-y-1 px-3">
        <Link
          href="/chat"
          className={cn(
            "focus-ring flex h-10 items-center gap-2.5 rounded-[12px] px-3 text-[14px] transition",
            isNewChat
              ? "bg-accent-soft text-ink"
              : "text-muted hover:bg-white/[0.04] hover:text-ink",
          )}
        >
          <SquarePen size={16} />
          New Chat
        </Link>
        <Link
          href="/studio"
          className={cn(
            "focus-ring flex h-10 items-center gap-2.5 rounded-[12px] px-3 text-[14px] font-medium transition",
            isStudio
              ? "bg-accent text-[#0a0c12]"
              : "btn-outline",
          )}
        >
          <Sparkles size={16} />
          Barada Studio
        </Link>
        <Link
          href="/search"
          className={cn(
            "focus-ring flex h-10 items-center gap-2.5 rounded-[12px] px-3 text-[14px] transition",
            pathname === "/search"
              ? "bg-white/[0.05] text-ink"
              : "text-muted hover:bg-white/[0.04] hover:text-ink",
          )}
        >
          <Search size={16} />
          Search
        </Link>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <p className="px-5 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
          Chats
        </p>
        <div className="mt-2 flex-1 overflow-y-auto px-2 pb-2">
          {sorted.length === 0 ? (
            <p className="px-3 py-6 text-[13px] leading-relaxed text-faint">
              Your conversations will live here.
            </p>
          ) : (
            sorted.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "group relative mb-0.5 rounded-[12px]",
                  activeChatId === chat.id && "bg-white/[0.05]",
                )}
              >
                {renaming === chat.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => {
                      if (renameValue.trim())
                        renameChat(chat.id, renameValue.trim());
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (renameValue.trim())
                          renameChat(chat.id, renameValue.trim());
                        setRenaming(null);
                      }
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    className="input-base h-11 w-full rounded-[12px] bg-transparent px-3 text-[13.5px]"
                  />
                ) : (
                  <Link
                    href={`/chat/${chat.id}`}
                    className="block rounded-[12px] px-3 py-2.5 pr-9 hover:bg-white/[0.04]"
                  >
                    <div className="truncate text-[13.5px] text-ink">
                      {chat.title}
                    </div>
                    <div className="truncate text-[12px] text-faint">
                      {chat.preview || formatRelativeTime(chat.updatedAt)}
                    </div>
                  </Link>
                )}
                <button
                  className="absolute top-2.5 right-2 hidden rounded-md p-1 text-faint hover:bg-white/10 hover:text-ink group-hover:block"
                  onClick={() =>
                    setOpenChatMenu(openChatMenu === chat.id ? null : chat.id)
                  }
                >
                  <MoreHorizontal size={14} />
                </button>
                {openChatMenu === chat.id ? (
                  <div className="absolute top-8 right-2 z-20 w-[140px] rounded-[12px] border border-line bg-[#141416] py-1 shadow-[var(--shadow)]">
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-white/5"
                      onClick={() => {
                        setRenaming(chat.id);
                        setRenameValue(chat.title);
                        setOpenChatMenu(null);
                      }}
                    >
                      <Pencil size={13} /> Rename
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-danger hover:bg-white/5"
                      onClick={() => {
                        deleteChat(chat.id);
                        setOpenChatMenu(null);
                        if (activeChatId === chat.id) router.push("/chat");
                      }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="space-y-0.5 px-3 pb-3">
          {comingSoon.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-9 items-center justify-between rounded-[10px] px-3 text-[13.5px]",
                  active ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
                )}
              >
                <span className="flex items-center gap-2.5 text-faint">
                  <Icon size={15} />
                  {item.label}
                </span>
                <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[10px] tracking-wide text-faint uppercase">
                  Soon
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="relative border-t border-line p-3" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left hover:bg-white/[0.04]"
        >
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-[12px] font-medium">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(name)
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px]">{name}</span>
            <span className="block truncate text-[12px] text-faint">
              {user ? "Signed in" : "Guest"}
            </span>
          </span>
          <Settings size={16} className="text-faint" />
        </button>

        {menuOpen ? (
          <div className="absolute right-3 bottom-[72px] left-3 z-30 overflow-hidden rounded-[14px] border border-line bg-[#141416] py-1.5 shadow-[var(--shadow)]">
            {accountLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3.5 py-2 text-[13.5px] text-ink/90 hover:bg-white/[0.05]"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-line" />
            {user && adminEmails.includes((user.email ?? "").toLowerCase()) ? (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="block px-3.5 py-2 text-[13.5px] text-accent hover:bg-white/[0.05]"
              >
                Admin dashboard
              </Link>
            ) : null}
            {user ? (
              <button
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13.5px] text-muted hover:bg-white/[0.05]"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/logout");
                }}
              >
                <LogOut size={14} /> Log out
              </button>
            ) : (
              <button
                className="w-full px-3.5 py-2 text-left text-[13.5px] text-accent hover:bg-white/[0.05]"
                onClick={() => {
                  setMenuOpen(false);
                  setAuthOpen(true);
                }}
              >
                Sign in
              </button>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
