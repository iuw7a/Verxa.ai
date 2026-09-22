"use client";

import { MobileHeader, MobileShell } from "@/components/mobile/mobile-shell";
import { GlassToggle } from "@/components/mobile/profile-settings-ui";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";

export default function MobileSecurityPage() {
  const { security, updateSecurity, sessions, loginHistory } = useWorkspace();
  const { user, setAuthOpen } = useAuth();

  return (
    <MobileShell>
      <MobileHeader title="Security" backHref="/mobile/profile" />
      <div className="mobile-scroll glass-fade-y min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[560px] px-4 py-4">
          <section>
            <p className="mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
              Two-factor authentication
            </p>
            <div className="glass glass-spec flex min-h-[56px] items-center justify-between gap-4 rounded-[20px] px-4 py-3">
              <span className="text-[14px] leading-6 text-muted">
                Require a second step when signing in from a new device.
              </span>
              <GlassToggle
                checked={security.twoFactorEnabled}
                onChange={(v) =>
                  updateSecurity({ twoFactorEnabled: v })
                }
                label="Two-factor authentication"
              />
            </div>
          </section>

          <section className="mt-5">
            <p className="mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
              Active sessions
            </p>
            <div className="glass glass-spec overflow-hidden rounded-[20px]">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 last:border-b-0"
                >
                  <span>
                    <span className="block text-[14px] text-ink">{s.device}</span>
                    <span className="block text-[12px] text-faint">
                      {s.location} · {s.lastActive}
                      {s.current ? " · Current" : ""}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <p className="mb-2 px-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
              Login history
            </p>
            <div className="glass glass-spec overflow-hidden rounded-[20px]">
              {loginHistory.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 text-[13.5px] last:border-b-0"
                >
                  <span className="text-muted">
                    {e.when} · {e.ip}
                  </span>
                  <span className={e.status === "success" ? "text-ok" : "text-danger"}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <p className="mt-5 px-1 text-[12px] leading-relaxed text-faint">
            Password changes for Supabase email accounts happen in the dashboard
            security settings
            {user ? "" : " — sign in first"}.
          </p>
          {!user ? (
            <button
              onClick={() => setAuthOpen(true)}
              className="glass-cta tab-item mt-4 w-full rounded-[16px] py-3.5 text-[15px] font-medium"
            >
              Sign in
            </button>
          ) : null}
        </div>
      </div>
    </MobileShell>
  );
}
