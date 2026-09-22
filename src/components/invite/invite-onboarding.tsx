"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { VerxaMark } from "@/components/brand/verxa-mark";
import {
  emptyOnboarding,
  loadOnboarding,
  saveOnboarding,
  type InviteDevice,
  type OnboardingState,
} from "@/lib/invite-onboarding";
import { DeviceSelector } from "@/components/invite/device-selector";
import { NameStep } from "@/components/invite/name-step";
import { VerxaIntroduction } from "@/components/invite/verxa-introduction";
import { FeatureExplorer } from "@/components/invite/feature-explorer";
import { TryVerxa } from "@/components/invite/try-verxa";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Device", "Name", "Meet Verxa", "Explore", "Start"];

export function InviteOnboarding({ source }: { source: string }) {
  const [state, setState] = useState<OnboardingState>(() => emptyOnboarding(source));
  const [ready, setReady] = useState(false);

  // Restore persisted state (refresh-safe) and record the visit once.
  useEffect(() => {
    const restored = loadOnboarding(source);
    setState(restored);
    setReady(true);
    fetch("/api/invite/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, step: "entered" }),
    })
      .then((r) => r.json().catch(() => null))
      .then((j) => {
        if (j?.id) {
          setState((prev) => {
            const next = { ...prev, visitId: j.id as string };
            saveOnboarding(next);
            return next;
          });
        }
      })
      .catch(() => {
        /* tracking is best-effort — onboarding must never break */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const go = useCallback(
    (step: number) => {
      setState((prev) => {
        const next = { ...prev, step: Math.min(Math.max(step, 0), 4) };
        saveOnboarding(next);
        return next;
      });
    },
    [],
  );

  const chooseDevice = useCallback(
    (device: InviteDevice) => {
      setState((prev) => {
        const next = { ...prev, device, step: Math.max(prev.step, 1) };
        saveOnboarding(next);
        return next;
      });
      go(1);
    },
    [go],
  );

  const submitName = useCallback(
    (name: string) => {
      setState((prev) => {
        const next = { ...prev, name, step: Math.max(prev.step, 2) };
        saveOnboarding(next);
        return next;
      });
      fetch("/api/invite/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, step: "named", name, visitId: state.visitId }),
      }).catch(() => {});
      go(2);
    },
    [go, source, state.visitId],
  );

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black" aria-busy="true">
        <span className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
      </div>
    );
  }

  const { step, device, name } = state;
  const canContinue = step === 0 ? device !== null : true;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-black text-white">
      {/* backdrop: dotted grid + aurora, Verxa identity */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 75%)",
          }}
        />
        <div className="absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute right-[-160px] bottom-[-120px] h-[380px] w-[520px] rounded-full bg-emerald-400/[0.07] blur-[140px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2" aria-label="Verxa home">
          <VerxaMark size={22} />
          <span className="text-[15px] font-medium tracking-tight">Verxa AI</span>
          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-white/70">
            INVITE
          </span>
        </Link>
        {/* progress */}
        <ol className="flex items-center gap-1.5" aria-label="Onboarding progress">
          {STEP_LABELS.map((label, i) => (
            <li key={label} title={label}>
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300",
                  i < step ? "w-5 bg-emerald-200/80" : i === step ? "w-8 bg-white" : "w-5 bg-white/15",
                )}
              />
            </li>
          ))}
        </ol>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center justify-center px-6 py-10">
        {step === 0 ? (
          <>
            <h1 className="text-center text-[28px] font-medium tracking-tight sm:text-[36px]">
              How do you want to use Verxa?
            </h1>
            <p className="mt-2 mb-8 text-center text-[14px] text-white/50">
              You were invited to try Verxa AI. Choose your experience to begin.
            </p>
            <DeviceSelector value={device} onSelect={chooseDevice} />
          </>
        ) : null}

        {step === 1 ? <NameStep initial={name} onSubmit={submitName} /> : null}
        {step === 2 ? (
          <>
            <VerxaIntroduction name={name} />
            <p className="mt-6 max-w-[460px] text-center text-[13.5px] leading-relaxed text-white/45">
              Take a quick tour of what Verxa can do — then step into your workspace.
            </p>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <h2 className="text-center text-[26px] font-medium tracking-tight sm:text-[32px]">
              What Verxa can do
            </h2>
            <p className="mt-2 mb-7 text-center text-[14px] text-white/50">
              Real capabilities, ready in your workspace.
            </p>
            <FeatureExplorer />
          </>
        ) : null}
        {step === 4 && device ? <TryVerxa name={name} device={device} /> : null}

        {/* nav */}
        <nav className="mt-10 flex w-full items-center justify-between" aria-label="Onboarding navigation">
          <button
            type="button"
            onClick={() => go(step - 1)}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-[13px] text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-0"
          >
            <ArrowLeft size={14} /> Back
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => go(step + 1)}
              disabled={!canContinue}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-2 text-[13.5px] font-semibold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {step === 0 ? "Continue" : step === 3 ? "Finish" : "Next"} <ArrowRight size={14} />
            </button>
          ) : (
            <span className="text-[12px] text-white/30">Invited by {source}</span>
          )}
        </nav>
      </main>
    </div>
  );
}
