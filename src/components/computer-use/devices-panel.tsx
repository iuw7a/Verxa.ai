"use client";

import { Monitor } from "lucide-react";
import { Button, Toggle } from "@/components/ui/primitives";
import { timeAgo, type CuConsent, type CuDevice } from "@/lib/computer-use-web";

/** Connected + revoked computers, with per-device and bulk revocation. */
export function DevicesPanel({
  devices,
  onRevoke,
  onRevokeAll,
  busyId,
}: {
  devices: CuDevice[];
  onRevoke: (deviceId: string) => void;
  onRevokeAll: () => void;
  busyId: string | null;
}) {
  const active = devices.filter((d) => d.status === "active");
  const revoked = devices.filter((d) => d.status !== "active").slice(0, 3);

  return (
    <div className="rounded-[18px] border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-medium text-ink">Connected computers</p>
        {active.length > 1 ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === "all"}
            onClick={onRevokeAll}
          >
            {busyId === "all" ? "Revoking…" : "Revoke all"}
          </Button>
        ) : null}
      </div>

      {active.length === 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          No computer is connected right now.
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {active.map((d) => (
            <div
              key={d.device_id}
              className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-3.5 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Monitor size={16} className="shrink-0 text-muted" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] text-ink">
                    {d.device_name ?? "Verxa connector"}
                    <span className="ml-2 rounded-full border border-ok/25 bg-ok/[0.08] px-1.5 py-px text-[10px] tracking-wide text-ok uppercase">
                      Connected
                    </span>
                  </p>
                  <p className="truncate text-[12px] text-faint">
                    {d.os ? `${d.os} · ` : ""}
                    {d.app_version ? `v${d.app_version} · ` : ""}
                    last active {timeAgo(d.last_seen)}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === d.device_id}
                onClick={() => onRevoke(d.device_id)}
              >
                {busyId === d.device_id ? "Revoking…" : "Revoke"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {revoked.length ? (
        <p className="mt-3 text-[12px] text-faint">
          Revoked:{" "}
          {revoked
            .map(
              (d) =>
                `${d.device_name ?? "Verxa connector"} (${timeAgo(d.revoked_at)})`,
            )
            .join(", ")}
        </p>
      ) : null}
    </div>
  );
}

const CONSENT_ROWS: { key: keyof CuConsent; title: string; desc: string }[] = [
  {
    key: "safe_mode",
    title: "Safe Mode",
    desc: "Blocks irreversible actions even while a session runs.",
  },
  { key: "screen_access", title: "Screen access", desc: "Verxa can see your screen." },
  { key: "mouse_control", title: "Mouse control", desc: "Move the pointer and click." },
  { key: "keyboard_control", title: "Keyboard control", desc: "Type and press keys." },
  {
    key: "app_control",
    title: "Applications & windows",
    desc: "Open, focus and close applications.",
  },
];

/** Granular permission toggles + the off switch (server-side consent). */
export function ConsentPanel({
  consent,
  onToggle,
  onDisable,
  busy,
}: {
  consent: CuConsent;
  onToggle: (patch: Partial<CuConsent>) => void;
  onDisable: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-line bg-card p-5">
      <p className="text-[15px] font-medium text-ink">Permissions</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        These apply to every session and are stored on the server, tied to
        your account.
      </p>
      <div className="mt-4 space-y-1">
        {CONSENT_ROWS.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 rounded-[12px] px-1 py-2.5"
          >
            <div>
              <p className="text-[13.5px] text-ink">{row.title}</p>
              <p className="text-[12px] text-faint">{row.desc}</p>
            </div>
            <Toggle
              checked={Boolean(consent[row.key])}
              label={row.title}
              onChange={(v) => onToggle({ [row.key]: v } as Partial<CuConsent>)}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
        <p className="text-[12.5px] leading-relaxed text-faint">
          Turning Computer Use off stops every session and blocks new ones.
        </p>
        <Button size="sm" variant="outline" disabled={busy} onClick={onDisable}>
          {busy ? "Saving…" : "Turn off Computer Use"}
        </Button>
      </div>
    </div>
  );
}
