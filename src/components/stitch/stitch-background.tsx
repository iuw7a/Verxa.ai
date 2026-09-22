"use client";

/**
 * Stitch-style backdrop: pure black, subtle dot grid, purple/blue aurora
 * glowing from the bottom — shared by landing + chat so both feel identical.
 * Own Verxa implementation, only inspired by the reference look.
 */
export function StitchBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
      {/* dot grid */}
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* darken center for text contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(90rem_50rem_at_50%_30%,transparent_40%,rgba(0,0,0,0.75)_100%)]" />
      {/* bottom aurora: violet left, blue right, cyan core */}
      <div className="absolute -bottom-[18%] -left-[10%] h-[55%] w-[70%] rounded-[100%] bg-[#7c3aed]/50 blur-[110px]" />
      <div className="absolute -bottom-[22%] -right-[10%] h-[60%] w-[70%] rounded-[100%] bg-[#3b82f6]/50 blur-[110px]" />
      <div className="absolute bottom-[-30%] left-[20%] h-[45%] w-[60%] rounded-[100%] bg-[#22d3ee]/25 blur-[130px]" />
      <div className="absolute bottom-[-10%] left-[8%] h-[30%] w-[40%] rounded-[100%] bg-[#a855f7]/40 blur-[90px]" />
    </div>
  );
}
