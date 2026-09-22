import type { Metadata } from "next";
import { InviteOnboarding } from "@/components/invite/invite-onboarding";

export const metadata: Metadata = {
  title: "You're invited — Verxa AI",
  description: "You were invited to try Verxa AI. Choose your experience and step inside.",
};

export default function AdminInvitePage() {
  return <InviteOnboarding source="admin" />;
}
