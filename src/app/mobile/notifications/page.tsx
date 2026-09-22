"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { MobileHeader, MobileShell } from "@/components/mobile/mobile-shell";
import { useAuth } from "@/providers/auth-provider";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  created_at: string;
};

export default function MobileNotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[] | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/notifications?scope=all");
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { notifications?: Notification[] };
        if (!cancelled) setItems(json.notifications ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function dismiss(id: string) {
    setItems((prev) => prev?.filter((n) => n.id !== id) ?? prev);
    void fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  return (
    <MobileShell>
      <MobileHeader title="Notifications" />
      <div className="mobile-scroll glass-fade-y min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[560px] px-4 py-4">
          {!user ? (
            <p className="glass animate-lx-rise rounded-[20px] px-6 pt-8 pb-8 text-center text-[13.5px] text-faint">
              Sign in to receive account notifications.
            </p>
          ) : items === null ? (
            <p className="px-1 pt-8 text-center text-[13.5px] text-faint">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <div className="glass glass-spec animate-lx-rise flex flex-col items-center justify-center rounded-[22px] px-6 py-12 text-center">
              <BellRing size={22} className="mb-2 text-faint" />
              <p className="text-[13.5px] text-faint">
                You&apos;re all caught up.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => void dismiss(n.id)}
                  className="glass glass-btn animate-lx-rise tab-item block w-full rounded-[18px] px-4 py-3.5 text-left"
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-medium text-ink">
                        {n.title}
                      </span>
                      {n.body ? (
                        <span className="mt-1 block text-[13px] leading-relaxed text-muted">
                          {n.body}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 rounded-full border border-white/15 bg-accent-soft px-2 py-0.5 text-[10.5px] tracking-wide text-accent uppercase">
                      new
                    </span>
                  </div>
                  <span className="mt-2 block text-[11.5px] text-faint">
                    {new Date(n.created_at).toLocaleString()} · tap to dismiss
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
