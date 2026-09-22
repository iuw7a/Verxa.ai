import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#050506] px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[38%] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(118,138,255,0.18),transparent_68%)] blur-2xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/verxa-logo.png"
        alt="Verxa"
        width={88}
        height={88}
        className="relative mb-8 opacity-95 select-none"
      />
      <p className="relative text-[64px] leading-none font-light tracking-[-0.05em] text-white/90">
        404
      </p>
      <p className="relative mt-4 text-[17px] font-light text-white/55">
        This page could not be found.
      </p>
      <Link
        href="/"
        className="relative mt-9 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-[14px] text-white/85 backdrop-blur-xl transition hover:bg-white/[0.1]"
      >
        Back to Verxa
      </Link>
    </div>
  );
}
