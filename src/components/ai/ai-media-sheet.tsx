"use client";

import Link from "next/link";
import { useRef } from "react";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

export function AiMediaSheet({
  open,
  onClose,
  onImageSelected,
}: {
  open: boolean;
  onClose: () => void;
  onImageSelected: (dataUrl: string) => void;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 7_000_000) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      onImageSelected(dataUrl);
      onClose();
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button aria-label="Schließen" className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="relative max-h-[82vh] overflow-y-auto rounded-t-[28px] bg-[#15171c] px-3 pt-3 pb-[max(env(safe-area-inset-bottom),14px)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

        {/* hidden inputs */}
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />

        {/* Top row — Fotos / Kamera / Vorschau like screenshot 2/3 */}
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex h-[112px] w-[112px] shrink-0 flex-col items-center justify-center gap-2 rounded-[28px] bg-[#2a2e39] text-white active:bg-[#343a4d]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="4" width="18" height="14" rx="3" />
                <path d="M7 12l2.2 2.2L14 9l4 6" />
                <rect x="13.5" y="7" width="4" height="4" rx="1.2" />
                <path d="M16 8.5l1.5 1.5" />
              </svg>
            </span>
            <span className="text-[14px] font-medium">Fotos</span>
          </button>

          <button
            onClick={() => cameraRef.current?.click()}
            className="flex h-[112px] w-[112px] shrink-0 flex-col items-center justify-center gap-2 rounded-[28px] bg-[#2a2e39] text-white active:bg-[#343a4d]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="4" y="6" width="16" height="12" rx="3" />
                <circle cx="12" cy="12" r="2.3" />
                <path d="M9 6l1.2-1.5h2.6L14 6" />
              </svg>
            </span>
            <span className="text-[14px] font-medium">Kamera</span>
          </button>

          {/* Third preview card partially visible like screenshot */}
          <div className="flex h-[112px] w-[112px] shrink-0 overflow-hidden rounded-[28px] bg-[#2a2e39]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/verxa-logo.png"
              alt=""
              className="h-full w-full object-cover opacity-50"
              style={{ filter: "brightness(0.6) contrast(1.1)" }}
            />
            <span className="absolute ml-[84px] mt-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px]">◯</span>
          </div>
        </div>

        {/* List like screenshot */}
        <div className="mt-3 space-y-0">
          <SheetRow
            icon={<ImageRowIcon />}
            title="Bilder"
            subtitle="Mahlzeit oder Messwert analysieren"
            href="/ai/image"
            onClick={onClose}
          />
          <SheetRow
            icon={<MusicIcon />}
            title="Dateien"
            subtitle="Dokument hochladen & besprechen"
            href="/ai/files"
            onClick={onClose}
          />
          <SheetRow
            icon={<CanvasIcon />}
            title="Voice"
            subtitle="Mit Stimme fragen & antworten"
            href="/ai/voice"
            onClick={onClose}
          />
          <SheetRow
            icon={<ResearchIcon />}
            title="Memory"
            subtitle="Persönlichen Kontext verwalten"
            href="/ai/memory"
            onClick={onClose}
          />
          <SheetRow
            icon={<BookIcon />}
            title="Verlauf"
            subtitle="Letzte Chats durchsuchen"
            href="/ai/history"
            onClick={onClose}
          />
        </div>

        <p className="mt-4 px-1 text-center text-[11px] text-white/25">Tippe auf Fotos/Kamera um ein Bild zu wählen — wird direkt an Verxa gesendet.</p>
      </div>
    </div>
  );
}

function SheetRow({
  icon,
  title,
  subtitle,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-white/[0.06]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/70">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-tight">{title}</span>
        <span className="block text-[12px] leading-tight text-white/45">{subtitle}</span>
      </span>
    </Link>
  );
}

function ImageRowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7 15l3-3 3 3L17 8l4 7H3" />
      <circle cx="8.2" cy="8.2" r="1.3" />
    </svg>
  );
}
function MusicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 18V6l8-2v12" />
      <circle cx="7" cy="18" r="2.2" />
      <circle cx="17" cy="16" r="2.2" />
    </svg>
  );
}
function CanvasIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12h8M12 8v8" />
      <rect x="13.5" y="13.5" width="4" height="4" rx="1" />
    </svg>
  );
}
function ResearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 8l8 8M16 8L8 16" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 5a2 2 0 012-2h4v16H6a2 2 0 00-2 2V5zM14 3h4a2 2 0 012 2v16a2 2 0 00-2-2h-4V3z" />
    </svg>
  );
}
