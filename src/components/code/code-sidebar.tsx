"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  Files,
  Layers,
  Plus,
  Settings,
  HelpCircle,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerxaMark } from "@/components/brand/verxa-mark";
import { AccountMenu } from "@/components/code/account-menu";
import type { CodeProject } from "@/lib/code-types";

type NavItem = {
  id: string;
  label: string;
  icon: typeof Plus;
  href?: string;
  onClick?: () => void;
  action?: string;
  badge?: string;
  primary?: boolean;
};

export function CodeSidebar({
  onNewProject,
  activeTab,
  onSelectTab,
  className,
}: {
  onNewProject?: () => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  className?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setProjectsLoading(true);
    void fetch("/api/code/projects", { cache: "no-store" })
      .then((res) => res.json() as Promise<{ projects?: CodeProject[] }>)
      .then((json) => {
        if (!cancelled) setProjects(Array.isArray(json.projects) ? json.projects : []);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const navItems: NavItem[] = [
    { id: "new", label: "New Project", icon: Plus, href: "/code", onClick: onNewProject, badge: "Create", primary: true },
    { id: "projects", label: "Projects", icon: FolderKanban, href: "/code" },
    { id: "files", label: "Files", icon: Files, href: pathname.startsWith("/code/") ? undefined : "/code", action: "files" },
    { id: "library", label: "Library", icon: Layers, href: "/plugins", action: "library" },
    { id: "models", label: "Models", icon: Cpu, href: "/#models" },
    { id: "settings", label: "Settings", icon: Settings, href: "/account/settings" },
  ];

  return (
    <aside
      className={cn(
        "flex h-dvh flex-col border-r border-white/10 bg-[#08090d] text-white transition-all duration-300 select-none",
        collapsed ? "w-[68px]" : "w-[248px]",
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-white/[0.08] px-3.5">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90">
          <VerxaMark size={24} className="shrink-0" />
          {!collapsed ? (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[14.5px] font-semibold tracking-tight text-white">
                Verxa <span className="text-[#8ea4ff]">Code</span>
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.04] px-1.5 py-px text-[9.5px] font-mono text-white/50">AI</span>
            </div>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white lg:block"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = activeTab === item.id || (item.id === "projects" && pathname === "/code");
            const content = (
              <div
                className={cn(
                  "group relative flex h-9.5 items-center gap-2.5 rounded-xl px-2.5 text-[13px] font-medium transition-all duration-150",
                  item.primary
                    ? "bg-[#8ea4ff]/15 text-[#8ea4ff] hover:bg-[#8ea4ff]/25 hover:text-white"
                    : selected
                      ? "bg-white/[0.08] text-white"
                      : "text-white/65 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                <Icon size={16} className={cn("shrink-0 transition-colors", item.primary ? "text-[#8ea4ff]" : "text-white/60 group-hover:text-white")} />
                {!collapsed ? (
                  <>
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {item.badge ? <span className="rounded-md border border-[#8ea4ff]/30 bg-[#8ea4ff]/10 px-1.5 py-0.5 text-[10px] font-mono text-[#8ea4ff]">{item.badge}</span> : null}
                  </>
                ) : null}
              </div>
            );

            if (item.action && onSelectTab) {
              return <button key={item.id} type="button" onClick={() => onSelectTab(item.action!)} title={collapsed ? item.label : undefined} className="w-full text-left">{content}</button>;
            }
            if (item.id === "new" && onNewProject) {
              return <button key={item.id} type="button" onClick={onNewProject} title={collapsed ? item.label : undefined} className="w-full text-left">{content}</button>;
            }
            return <Link key={item.id} href={item.href ?? "/code"} title={collapsed ? item.label : undefined} className="block">{content}</Link>;
          })}
        </div>

        {!collapsed ? (
          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between px-2 text-[10px] font-medium tracking-[0.14em] text-white/35 uppercase">
              <span>Your projects</span>
              {projectsLoading ? <Loader2 size={12} className="animate-spin text-[#8ea4ff]" /> : null}
            </div>
            <div className="mt-2 space-y-0.5">
              {projects.length === 0 && !projectsLoading ? (
                <p className="px-2 py-2 text-[11px] leading-relaxed text-white/35">No projects yet.</p>
              ) : projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/code/${project.id}`}
                  title={project.title}
                  className={cn(
                    "block truncate rounded-lg px-2 py-2 text-[12px] transition hover:bg-white/[0.05] hover:text-white",
                    pathname === `/code/${project.id}` ? "bg-white/[0.08] text-white" : "text-white/55",
                  )}
                >
                  {project.title}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-1 border-t border-white/[0.08] p-2">
        <Link href="/support" title={collapsed ? "Help & Support" : undefined} className="flex h-9 items-center gap-2.5 rounded-xl px-2.5 text-[13px] text-white/60 transition hover:bg-white/[0.05] hover:text-white">
          <HelpCircle size={16} className="shrink-0 text-white/50" />
          {!collapsed ? <span>Help & Docs</span> : null}
        </Link>
        <div className="pt-1"><AccountMenu placement="bottom-left" /></div>
      </div>
    </aside>
  );
}
