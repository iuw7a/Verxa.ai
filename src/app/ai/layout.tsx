import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Verxa AI — Diabetes Assistant",
  description: "Your personal Verxa AI assistant for diabetes: chat, voice, images, memory.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-black text-white" data-theme="dark">
      {children}
    </div>
  );
}
