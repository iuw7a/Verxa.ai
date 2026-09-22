"use client";

import { useEffect, useState } from "react";
import { Apple, Download, MonitorSmartphone, CheckCircle2, Smartphone } from "lucide-react";
import { MarketingShell } from "@/components/marketing/shell";

type VersionInfo = {
  windows: {
    available: boolean;
    version?: string;
    releaseDate?: string;
    downloadUrl?: string;
    sha256?: string | null;
    notes?: string | null;
  };
  macos: { available: boolean; status?: string };
  ios: { available: boolean; status?: string };
  android: { available: boolean; status?: string };
};

export default function DownloadsPage() {
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const res = await fetch("/api/desktop/version");
        if (res.ok && !dead) setInfo(await res.json());
      } catch {
        /* offline — show coming-soon state */
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  const win = info?.windows;
  const released = win?.available && win.downloadUrl;

  return (
    <MarketingShell>
      <p className="eyebrow">Downloads</p>
      <h1 className="display-1">Verxa for every device</h1>
      <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-muted">
        One account everywhere. Chats, models and settings sync between web and
        desktop automatically.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[16px] border border-line bg-bg-elevated/60 p-6">
          <div className="flex items-center gap-2.5">
            <MonitorSmartphone size={18} className="text-accent" />
            <h2 className="text-[17px] font-medium">Verxa Desktop</h2>
          </div>
          <p className="mt-1 text-[13px] text-muted">Windows 10 / 11 · 64-bit</p>
          {released ? (
            <>
              <p className="mt-3 text-[13px] text-muted">
                Version {win.version}
                {win.releaseDate
                  ? ` · Released ${new Date(win.releaseDate).toLocaleDateString()}`
                  : ""}
              </p>
              <a
                href={win.downloadUrl}
                className="btn-primary mt-4 inline-flex items-center gap-2 rounded-[12px] px-5 py-2.5 text-[14px] font-medium"
              >
                <Download size={15} />
                Download for Windows
              </a>
              {win.sha256 ? (
                <p className="mt-3 break-all font-mono text-[11px] text-faint">
                  SHA-256: {win.sha256}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-3 flex items-center gap-1.5 text-[13.5px] text-muted">
                <CheckCircle2 size={14} className="text-ok" />
                {info ? "Windows build is being prepared." : "Checking availability…"}
              </p>
              <button disabled className="mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-[12px] bg-white/10 px-5 py-2.5 text-[14px] text-muted">
                <Download size={15} />
                Download for Windows
              </button>
            </>
          )}
        </div>

        <div className="rounded-[16px] border border-line bg-bg-elevated/60 p-6">
          <div className="flex items-center gap-2.5">
            <Apple size={18} className="text-muted" />
            <h2 className="text-[17px] font-medium">macOS</h2>
          </div>
          <p className="mt-1 text-[13px] text-muted">Verxa Desktop for Mac</p>
          <p className="mt-3 inline-block rounded-full bg-white/[0.06] px-3 py-1 text-[12.5px] text-muted">
            Coming Soon
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-faint">
            The Windows release comes first. macOS follows as soon as the
            production build is signed and tested.
          </p>
        </div>

        <div className="rounded-[16px] border border-line bg-bg-elevated/60 p-6">
          <div className="flex items-center gap-2.5">
            <Smartphone size={18} className="text-muted" />
            <h2 className="text-[17px] font-medium">iOS</h2>
          </div>
          <p className="mt-3 inline-block rounded-full bg-white/[0.06] px-3 py-1 text-[12.5px] text-muted">
            Coming Soon
          </p>
        </div>

        <div className="rounded-[16px] border border-line bg-bg-elevated/60 p-6">
          <div className="flex items-center gap-2.5">
            <Smartphone size={18} className="text-muted" />
            <h2 className="text-[17px] font-medium">Android</h2>
          </div>
          <p className="mt-3 inline-block rounded-full bg-white/[0.06] px-3 py-1 text-[12.5px] text-muted">
            Coming Soon
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-[16px] border border-line bg-bg-elevated/60 p-6">
        <h2 className="text-[16px] font-medium">How desktop login works</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-muted">
          <li>Install Verxa and click Sign in.</li>
          <li>Your browser opens a secure one-time login page.</li>
          <li>Approve the device — the desktop signs in automatically.</li>
        </ol>
        <p className="mt-2 text-[13px] text-faint">
          No passwords ever touch the desktop app. Sessions can be revoked anytime
          in account settings.
        </p>
      </div>
    </MarketingShell>
  );
}
