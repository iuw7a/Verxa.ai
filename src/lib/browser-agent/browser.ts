import "server-only";

import { Sandbox } from "e2b";

/**
 * Browser Agent core (browser-use capabilities, Vercel-native edition).
 * One session = one E2B sandbox with headless Chromium (Playwright).
 */

export function browserAgentEnabled(): boolean {
  return Boolean(process.env.E2B_API_KEY?.trim());
}

export type BrowserAction =
  | { type: "goto"; url: string }
  | { type: "click"; selector: string }
  | { type: "type"; selector: string; text: string }
  | { type: "scroll"; direction: "down" | "up"; pixels?: number }
  | { type: "wait"; ms: number }
  | { type: "read" }
  | { type: "screenshot" };

export type BrowserSession = {
  sandbox: Sandbox;
  ready: boolean;
  readyError?: string;
};

export type RunnerResult = {
  finalUrl: string;
  finalTitle: string;
  text: string;
  links: { text: string; href: string }[];
  screenshot: string | null;
  steps: { action: string; ok: boolean; error?: string }[];
  error: string | null;
};
