import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Verxa — Mobile",
  description: "Verxa AI on mobile.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
