import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  ImageIcon,
  Clapperboard,
  Wand2,
  Film,
  Pencil,
  ArrowRight,
  Check,
  Clock,
} from "lucide-react";
import { VerxaMark, VerxaWordmark } from "@/components/brand/verxa-mark";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/chrome";

export const metadata: Metadata = {
  title: "Barada Studio — Coming Soon | Verxa AI",
  description:
    "Barada Studio is Verxa's creative AI workspace: generate and edit images, transform styles, and turn any image into video. Image and video generation are live today.",
};

const live = [
  {
    icon: ImageIcon,
    title: "Image generation",
    text: "Full prompts to photorealistic images — live in Barada Studio today.",
  },
  {
    icon: Clapperboard,
    title: "Video generation",
    text: "Text-to-video with camera and scene direction — available now.",
  },
];

const coming = [
  {
    icon: Pencil,
    title: "Image editing",
    text: "Change clothes, swap backgrounds, fix details — with a plain instruction.",
  },
  {
    icon: Wand2,
    title: "Style transform",
    text: "Same subject, completely new look: cinematic, noir, golden hour…",
  },
  {
    icon: Film,
    title: "Image to video",
    text: "Animate any image — camera motion, parallax, living scenes.",
  },
];

export default function StudioComingSoonPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="hero-aurora relative overflow-hidden">
          <div className="relative mx-auto flex w-full max-w-[860px] flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28">
            <span className="bg-card mb-7 flex h-14 w-14 items-center justify-center rounded-[16px] shadow-[0_10px_40px_-10px_var(--glow)]">
              <VerxaMark size={30} />
            </span>
            <p className="eyebrow mb-4 flex items-center gap-2">
              <Sparkles size={12} className="text-accent" />
              Barada Studio
            </p>
            <h1 className="display-1 text-[40px] sm:text-[56px]">
              A creative AI studio,
              <br />
              <span className="text-muted">opening inside Verxa</span>
            </h1>
            <p className="mt-5 max-w-[560px] text-[17px] leading-relaxed font-light text-muted">
              One workspace to generate, edit, transform and animate. The
              first doors are already open — image and video generation are
              live today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/studio"
                className="btn-primary focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] px-6 text-[14.5px] font-medium"
              >
                Try it now
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/chat"
                className="btn-outline focus-ring inline-flex h-11 items-center rounded-[10px] px-5 text-[14.5px] font-medium"
              >
                Back to chat
              </Link>
            </div>
          </div>
        </section>

        {/* Live now */}
        <section className="mx-auto w-full max-w-[1080px] px-6 pb-14">
          <div className="grid gap-4 md:grid-cols-2">
            {live.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-card hover-lift rounded-[16px] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent-soft text-accent">
                      <Icon size={18} />
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-1 text-[11.5px] font-medium text-ok">
                      <Check size={12} />
                      Live now
                    </span>
                  </div>
                  <h3 className="text-[16.5px] font-medium tracking-[-0.02em]">{f.title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{f.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Coming next */}
        <section className="mx-auto w-full max-w-[1080px] px-6 pb-16">
          <div className="mb-6 text-center">
            <p className="eyebrow mb-2 flex items-center justify-center gap-2">
              <Clock size={12} />
              Opening next
            </p>
            <h2 className="display-2 text-[26px] sm:text-[30px]">
              Editing, transforming, animating
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {coming.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-card relative overflow-hidden rounded-[16px] p-6">
                  <span className="pointer-events-none absolute top-4 right-5 text-[40px] font-light text-white/[0.05]">
                    0{i + 1}
                  </span>
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/[0.05] text-muted">
                    <Icon size={18} />
                  </span>
                  <h3 className="text-[16px] font-medium tracking-[-0.02em]">{f.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{f.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-faint">
                    <span className="status-dot h-1.5 w-1.5 rounded-full bg-accent" />
                    In final testing
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it will work */}
        <section className="mx-auto w-full max-w-[1080px] px-6 pb-20">
          <div className="bg-card rounded-[20px] p-8 text-center sm:p-10">
            <h2 className="display-2 text-[24px] sm:text-[28px]">
              Generate it. Change it. Move it.
            </h2>
            <p className="mx-auto mt-3 max-w-[540px] text-[14.5px] leading-relaxed text-muted">
              Every image you create will carry its own actions — edit it with
              an instruction, restyle it, or turn it into a moving scene, then
              download or keep it in your library.
            </p>
            <div className="mx-auto mt-8 flex max-w-[560px] flex-col items-stretch gap-2 text-left sm:flex-row sm:items-center">
              {[
                { step: "1", label: "Generate" },
                { step: "2", label: "Edit" },
                { step: "3", label: "Transform" },
                { step: "4", label: "Animate" },
              ].map((s, i) => (
                <div key={s.step} className="flex flex-1 items-center gap-2">
                  <div className="btn-outline flex flex-1 items-center justify-center gap-2 rounded-[12px] px-3 py-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                      {s.step}
                    </span>
                    <span className="text-[13.5px] font-medium">{s.label}</span>
                  </div>
                  {i < 3 && <ArrowRight size={14} className="hidden shrink-0 text-faint sm:block" />}
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link
                href="/studio"
                className="btn-primary focus-ring inline-flex h-11 items-center gap-2 rounded-[10px] px-6 text-[14.5px] font-medium"
              >
                Open Barada Studio
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
