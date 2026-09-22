"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountChrome } from "@/components/account/account-chrome";
import { Button, Card, Field, Input, Toggle } from "@/components/ui/primitives";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import {
  getDevices,
  revokeDevice,
  timeAgo,
  type CuDevice,
} from "@/lib/computer-use-web";

export default function SecurityPage() {
  const { security, updateSecurity, sessions, loginHistory } = useWorkspace();
  const { user, setAuthOpen } = useAuth();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [cuDevices, setCuDevices] = useState<CuDevice[]>([]);
  const [cuBusy, setCuBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let dead = false;
    void getDevices().then((res) => {
      if (!dead && res.ok) setCuDevices(res.data.devices);
    });
    return () => {
      dead = true;
    };
  }, [user]);

  async function revokeCu(deviceId: string) {
    setCuBusy(deviceId);
    const res = await revokeDevice(deviceId);
    setCuBusy(null);
    if (res.ok) {
      setCuDevices((prev) =>
        prev.map((d) =>
          d.device_id === deviceId ? { ...d, status: "revoked" } : d,
        ),
      );
    }
  }


  return (
    <AccountChrome
      title="Security"
      description="Passwords, sessions, and the devices that can reach your Verxa account."
    >
      <Card className="space-y-3">
        <p className="text-[15px]">Change password</p>
        <Field label="Current password">
          <Input
            type="password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
          />
        </Field>
        <Field label="New password">
          <Input
            type="password"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
          />
        </Field>
        <Button
          onClick={() => {
            if (!user) {
              setAuthOpen(true);
              return;
            }
            if (pw.next.length < 8 || pw.next !== pw.confirm) {
              setMsg("Passwords must match and be at least 8 characters.");
              return;
            }
            setMsg("Password update is available once you are signed in with email auth.");
          }}
        >
          Update password
        </Button>
        {msg ? <p className="text-[13px] text-muted">{msg}</p> : null}
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-[15px]">Two-factor authentication</p>
          <p className="mt-1 text-[13px] text-muted">
            Require a second step when signing in from a new device.
          </p>
        </div>
        <Toggle
          checked={security.twoFactorEnabled}
          onChange={(v) => updateSecurity({ twoFactorEnabled: v })}
        />
      </Card>

      <Card>
        <p className="mb-4 text-[15px]">Active sessions</p>
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-[12px] border border-line px-3 py-3"
            >
              <div>
                <p className="text-[14px]">{s.device}</p>
                <p className="text-[12px] text-faint">
                  {s.location} · {s.lastActive}
                  {s.current ? " · Current" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-4" variant="subtle">
          Log out from all devices
        </Button>
      </Card>

      <Card>
        <p className="mb-4 text-[15px]">Login history</p>
        <div className="space-y-2">
          {loginHistory.map((e) => (
            <div key={e.id} className="flex justify-between text-[13.5px]">
              <span>
                {e.when} · {e.ip}
              </span>
              <span className={e.status === "success" ? "text-ok" : "text-danger"}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px]">Computer Use</p>
          <Link
            href="/chat"
            className="text-[13px] text-accent underline-offset-4 hover:underline"
          >
            Open in Chat →
          </Link>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Computers authorized to act on your behalf. Sessions start only when
          you ask, and you can stop them or revoke access at any time.
        </p>
        {!user ? (
          <p className="mt-3 text-[13px] text-faint">
            Sign in to see your authorized computers.
          </p>
        ) : cuDevices.filter((d) => d.status === "active").length === 0 ? (
          <p className="mt-3 text-[13px] text-faint">
            No computer is connected right now.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {cuDevices
              .filter((d) => d.status === "active")
              .map((d) => (
                <div
                  key={d.device_id}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px]">
                      {d.device_name ?? "Verxa connector"}
                    </p>
                    <p className="truncate text-[12px] text-faint">
                      {d.os ? `${d.os} · ` : ""}
                      {d.app_version ? `v${d.app_version} · ` : ""}
                      last active {timeAgo(d.last_seen)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cuBusy === d.device_id}
                    onClick={() => void revokeCu(d.device_id)}
                  >
                    {cuBusy === d.device_id ? "Revoking…" : "Revoke"}
                  </Button>
                </div>
              ))}
          </div>
        )}
      </Card>
    </AccountChrome>
  );
}
