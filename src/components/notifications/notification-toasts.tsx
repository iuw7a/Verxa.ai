"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PartyPopper, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  created_at: string;
};

export function NotificationToasts() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Notification[]>([]);
  const [visible, setVisible] = useState<Notification | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback((from: Notification[]) => {
    const [next, ...rest] = from;
    if (!next) {
      setVisible(null);
      return;
    }
    setVisible(next);
    setQueue(rest);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setVisible(null);
      void fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: next.id }),
      }).catch(() => {});
    }, 8000);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const json = (await res.json()) as { notifications?: Notification[] };
        if (cancelled || !json.notifications?.length) return;
        const fresh = json.notifications.filter((n) => !seenIds.current.has(n.id));
        if (!fresh.length) return;
        for (const n of fresh) seenIds.current.add(n.id);
        setQueue((prev) => [...prev, ...fresh]);
        setVisible((cur) => cur ?? fresh[0]);
        setQueue((prev) => {
          if (visible) return prev.slice(1);
          return prev;
        });
      } catch {
        /* offline — retry on next tick */
      }
    }

    void poll();
    const interval = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Advance the queue when a toast is dismissed.
  useEffect(() => {
    if (visible || queue.length === 0) return;
    const t = setTimeout(() => showNext(queue), 400);
    return () => clearTimeout(t);
  }, [visible, queue, showNext]);

  if (!visible) return null;

  const isPro = visible.kind === "subscription_started";

  return (
    <div className="fixed right-5 bottom-5 z-[70] w-[340px]">
      <div
        key={visible.id}
        className={cn(
          "animate-rise rounded-[16px] border p-4 shadow-[var(--shadow)] backdrop-blur-xl",
          isPro
            ? "border-accent/40 bg-gradient-to-br from-[#171a2e] to-[#101013]"
            : "border-line bg-[#141416]",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
              isPro ? "bg-accent-soft text-accent" : "bg-white/[0.05] text-muted",
            )}
          >
            <PartyPopper size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-ink">{visible.title}</p>
            {visible.body ? (
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{visible.body}</p>
            ) : null}
          </div>
          <button
            onClick={() => {
              setVisible(null);
              void fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: visible.id }),
              }).catch(() => {});
            }}
            className="rounded-lg p-1 text-faint transition hover:text-ink"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
        {isPro ? (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-full origin-left animate-toast-bar bg-accent" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
