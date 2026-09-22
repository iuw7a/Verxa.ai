"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  ChevronRight,
  FileUp,
  Film,
  ImageIcon,
  MonitorSmartphone,
  Music4,
  Palette,
  Plug,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AddMenuAction =
  | { kind: "upload-image" }
  | { kind: "upload-files" }
  | { kind: "upload-drive" }
  | { kind: "link"; href: string };

export type AddMenuItem = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  action: AddMenuAction;
  disabled?: boolean;
  dividerAfter?: boolean;
  chevron?: boolean;
};

/**
 * Der runde `+`-Button links in der Chatbar plus Gemini-artigem Menü.
 * Wiederverwendet auf `/` und `/chat` — die Aktionen (Upload, Medien-
 * Modi, Plugins, Computer-Modus) funktionieren auf beiden Routen, weil
 * sie direkt den Composer bzw. echte App-Seiten ansteuern.
 */
export function AddMenuButton({
  onAction,
  open,
  onOpenChange,
}: {
  onAction: (action: AddMenuAction) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  /* Außerhalb klicken oder Escape schließt das Menü. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const items: AddMenuItem[] = [
    {
      id: "files",
      label: "Dateien hochladen",
      hint: "Foto, PDF …",
      icon: FileUp,
      action: { kind: "upload-files" },
    },
    {
      id: "generate-image",
      label: "Bild generieren",
      hint: "KI-Bild",
      icon: ImageIcon,
      action: { kind: "link", href: "/studio" },
    },
    {
      id: "generate-video",
      label: "Video generieren",
      hint: "KI-Video",
      icon: Film,
      action: { kind: "link", href: "/studio" },
    },
    {
      id: "music",
      label: "Musik erstellen",
      hint: "Bald",
      icon: Music4,
      action: { kind: "link", href: "/studio/coming-soon" },
      dividerAfter: true,
      disabled: true,
    },
    {
      id: "computer",
      label: "Computer-Modus",
      hint: "Web live",
      icon: MonitorSmartphone,
      chevron: true,
      action: { kind: "link", href: "/chat?mode=computer" },
    },
    {
      id: "deep",
      label: "Tief recherchieren",
      hint: "Gründlich",
      icon: Brain,
      chevron: true,
      action: { kind: "link", href: "/chat?mode=deep" },
    },
    {
      id: "style",
      label: "Stil & Gedächtnis",
      hint: "Profil",
      icon: Palette,
      action: { kind: "link", href: "/account/profile" },
    },
    {
      id: "plugins",
      label: "Plugins verbinden",
      hint: "Google …",
      icon: Plug,
      action: { kind: "link", href: "/plugins" },
    },
  ];

  function handle(item: AddMenuItem) {
    if (item.disabled) return;
    if (item.action.kind === "upload-files") {
      fileRef.current?.click();
      return;
    }
    if (item.action.kind === "upload-image") {
      imageRef.current?.click();
      return;
    }
    if (item.action.kind === "upload-drive") return;
    onOpenChange(false);
    if (item.action.kind === "link") {
      router.push(item.action.href);
    } else {
      onAction(item.action);
    }
  }


  return (
    <div ref={wrapRef} className="relative mb-0.5 shrink-0">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="Hinzufügen"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white",
          open ? "bg-white/10 text-white" : "text-white/60",
        )}
      >
        <Plus size={18} />
      </button>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,.pdf,.txt,.md,.csv,.doc,.docx"
        onChange={(e) => {
          onAction({ kind: "upload-files" });
          e.target.value = "";
        }}
      />
      <input
        ref={imageRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*"
        onChange={(e) => {
          onAction({ kind: "upload-image" });
          e.target.value = "";
        }}
      />
      {open ? (
        <div
          role="menu"
          aria-label="Hinzufügen"
          className="animate-spatial-materialize absolute bottom-[calc(100%+12px)] left-0 z-50 w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#121219]/95 p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => handle(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] text-white/85 transition",
                    item.disabled
                      ? "cursor-not-allowed opacity-40"
                      : "hover:bg-white/[0.07] hover:text-white",
                  )}
                >
                  <Icon size={16} className="shrink-0 text-white/55" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint ? (
                    <span className="shrink-0 text-[11px] text-white/35">{item.hint}</span>
                  ) : null}
                  {item.chevron ? (
                    <ChevronRight size={14} className="shrink-0 text-white/30" />
                  ) : null}
                </button>
                {item.dividerAfter ? (
                  <div className="mx-3 my-1.5 h-px bg-white/10" />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
