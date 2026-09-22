/**
 * Invite onboarding state + feature catalog.
 *
 * Single source of truth for the /invite/* flow. New Verxa capabilities
 * are added to FEATURES — the onboarding UI renders them automatically.
 * Only list capabilities that actually exist in the app.
 */

export type InviteDevice = "mobile" | "desktop";

export type OnboardingState = {
  /** "mobile" | "desktop" — decided in step 1, controls the final route. */
  device: InviteDevice | null;
  /** Free-text display name from step 2. */
  name: string;
  /** Where the invite came from, e.g. "admin". Never expose admin internals. */
  source: string;
  /** Highest completed step index (for refresh-resume). */
  step: number;
  /** Server-side visit id once recorded. */
  visitId?: string;
};

export const ONBOARDING_KEY = "verxa-invite-onboarding";

export const emptyOnboarding = (source: string): OnboardingState => ({
  device: null,
  name: "",
  source,
  step: 0,
});

export function loadOnboarding(source: string): OnboardingState {
  if (typeof window === "undefined") return emptyOnboarding(source);
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return emptyOnboarding(source);
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    if (parsed.source !== source) return emptyOnboarding(source);
    return {
      device: parsed.device === "mobile" || parsed.device === "desktop" ? parsed.device : null,
      name: typeof parsed.name === "string" ? parsed.name.slice(0, 40) : "",
      source,
      step: typeof parsed.step === "number" ? Math.min(Math.max(parsed.step, 0), 4) : 0,
      visitId: typeof parsed.visitId === "string" ? parsed.visitId : undefined,
    };
  } catch {
    return emptyOnboarding(source);
  }
}

export function saveOnboarding(state: OnboardingState) {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  } catch {
    /* private mode — onboarding still works for this session */
  }
}

export function clearOnboarding() {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
}

/** Destination sandbox for a device choice. */
export function sandboxRoute(device: InviteDevice): string {
  return device === "mobile" ? "/mobile/chat" : "/desktop/chat";
}

/* ------------------------------------------------------------------ */
/* Feature catalog — extensible. `icon` is a lucide name resolved by   */
/* the FeatureExplorer component. `status` gates future rollouts.      */
/* ------------------------------------------------------------------ */

export type FeatureStatus = "live" | "soon";

export type VerxaFeature = {
  id: string;
  icon: string;
  title: string;
  text: string;
  status: FeatureStatus;
};

export const FEATURES: VerxaFeature[] = [
  {
    id: "chat",
    icon: "messages",
    title: "AI Chat",
    text: "Think, write and decide with 40+ models — including Qwen, Mistral, MiniMax and GPT-OSS.",
    status: "live",
  },
  {
    id: "browser",
    icon: "globe",
    title: "Browser Use",
    text: "Let Verxa interact with websites and complete browser-based tasks for you.",
    status: "live",
  },
  {
    id: "computer",
    icon: "monitor",
    title: "Computer Use",
    text: "Give Verxa the ability to work with computer interfaces and perform multi-step tasks.",
    status: "live",
  },
  {
    id: "agents",
    icon: "workflow",
    title: "AI Agents",
    text: "Create intelligent workflows that reason, use tools and complete tasks end to end.",
    status: "live",
  },
  {
    id: "coding",
    icon: "code",
    title: "Coding",
    text: "Build, modify and understand software with Verxa Code — preview, diffs and deploy included.",
    status: "live",
  },
  {
    id: "research",
    icon: "search",
    title: "Research",
    text: "Let Verxa investigate complex topics across the web and organize the results with sources.",
    status: "live",
  },
  {
    id: "memory",
    icon: "brain",
    title: "Memory",
    text: "Keep useful context available across your Verxa experience — Verxa remembers what matters.",
    status: "live",
  },
  {
    id: "image",
    icon: "image",
    title: "Image Generation",
    text: "Turn text into cinematic images, right inside the chat or in Barada Studio.",
    status: "live",
  },
  {
    id: "video",
    icon: "video",
    title: "Video Generation",
    text: "Generate short video clips from a text prompt and watch them complete in the chat.",
    status: "live",
  },
  {
    id: "files",
    icon: "file",
    title: "File Understanding",
    text: "Attach photos and files so Verxa can see, read and reason about them.",
    status: "live",
  },
  {
    id: "tools",
    icon: "plug",
    title: "Tools & Integrations",
    text: "Connect Gmail, Calendar and Drive — Verxa works with your real data, read-only and safe.",
    status: "live",
  },
  {
    id: "projects",
    icon: "folder",
    title: "Projects",
    text: "Keep chats, files and workspaces organized per project instead of one long list.",
    status: "live",
  },
];
