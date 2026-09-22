"use client";

import {
  Brain,
  Code2,
  FileText,
  FolderKanban,
  Globe,
  Image as ImageIcon,
  MessagesSquare,
  MonitorSmartphone,
  Plug,
  Search,
  Video,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { FEATURES } from "@/lib/invite-onboarding";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  messages: MessagesSquare,
  globe: Globe,
  monitor: MonitorSmartphone,
  workflow: Workflow,
  code: Code2,
  search: Search,
  brain: Brain,
  image: ImageIcon,
  video: Video,
  file: FileText,
  plug: Plug,
  folder: FolderKanban,
};

/**
 * Interactive capability cards. New entries in FEATURES render
 * automatically; `status: "soon"` shows a muted badge instead.
 */
export function FeatureExplorer() {
  return (
    <ul className="grid w-full gap-3 text-left sm:grid-cols-2" aria-label="Verxa capabilities">
      {FEATURES.map((f) => {
        const Icon = ICONS[f.icon] ?? MessagesSquare;
        const soon = f.status === "soon";
        return (
          <li
            key={f.id}
            className={cn(
              "group rounded-2xl border p-4 transition-colors duration-200",
              soon
                ? "border-white/[0.07] bg-white/[0.01] opacity-70"
                : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]",
            )}
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-emerald-100/90">
                <Icon size={17} strokeWidth={1.8} />
              </span>
              <span className="text-[14.5px] font-medium text-white">{f.title}</span>
              {soon ? (
                <span className="ml-auto rounded-full border border-white/15 px-2 py-0.5 text-[10.5px] text-white/50">
                  Soon
                </span>
              ) : null}
            </span>
            <p className="mt-2.5 text-[13px] leading-relaxed text-white/55">{f.text}</p>
          </li>
        );
      })}
    </ul>
  );
}
