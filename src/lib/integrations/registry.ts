/**
 * Client-safe integration catalog: what the Plugins page renders and what the
 * AI uses to discover available tools. Contains NO secrets — only metadata.
 *
 * Tool implementations live server-side (src/lib/integrations/tools/*) and are
 * keyed by the same tool ids used here.
 */

export type IntegrationCategory = "email" | "calendar" | "files" | "communication" | "travel" | "dev" | "other";

export type IntegrationTool = {
  id: string;
  name: string;
  description: string;
  /** Extra scopes this specific tool needs beyond the base connection. */
  requiresScopes?: string[];
  /** Tool requires user confirmation before effects leave Verxa (e.g. send). */
  confirmationRequired?: boolean;
};

export type IntegrationDef = {
  id: string; // provider id (matches verxa_integration_connections.provider)
  name: string;
  tagline: string;
  description: string;
  icon: string; // lucide icon name
  category: IntegrationCategory;
  authType: "oauth" | "api_key";
  /** Human-readable permission list shown before/after connecting. */
  permissions: string[];
  tools: IntegrationTool[];
  enabled: boolean; // feature flag — admin can gate rollouts
  configurable: boolean; // whether OAuth creds are expected to exist
};

export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "google",
    name: "Google",
    tagline: "Gmail · Calendar · Drive",
    description:
      "Connect Google to let Verxa work with your Gmail, Calendar and Drive — find important emails, check your schedule, and locate files.",
    icon: "chrome",
    category: "email",
    authType: "oauth",
    permissions: [
      "Read your email (read-only)",
      "Read email metadata (sender, subject, labels)",
      "Read calendars and events (read-only)",
      "See and download Drive files (read-only)",
      "Know which Google account is connected",
    ],
    tools: [
      { id: "gmail_list", name: "List emails", description: "List recent emails from your Gmail inbox." },
      { id: "gmail_search", name: "Search email", description: "Search your Gmail with a query." },
      { id: "gmail_read", name: "Read email", description: "Read one email's full content by id." },
      { id: "calendar_list", name: "List events", description: "Show upcoming calendar events." },
      { id: "drive_search", name: "Search Drive", description: "Find files in your Google Drive." },
      {
        id: "gmail_draft",
        name: "Draft email",
        description: "Create a Gmail draft. Never sends without your explicit confirmation.",
        confirmationRequired: true,
      },
    ],
    enabled: true,
    configurable: true,
  },
  {
    id: "browser",
    name: "Browser Agent",
    tagline: "Echter Browser · öffnen · klicken · lesen",
    description:
      "Verxa öffnet Webseiten in einem echten headless Chromium (E2B-Cloud-Sandbox), klickt, tippt, scrollt und liest Ergebnisse — inspiriert von browser-use, als Server-Tool für Vercel neu gebaut. Braucht E2B_API_KEY.",
    icon: "globe",
    category: "dev",
    authType: "api_key",
    permissions: ["Opens public pages in a cloud browser on request (no logins, no payments)"],
    tools: [
      { id: "browse", name: "Browse page", description: "Open a URL and read its live content + screenshot." },
      { id: "click", name: "Click element", description: "Click a button/link via CSS selector." },
      { id: "form", name: "Fill form", description: "Type into search/login-free fields (never passwords)." },
    ],
    enabled: true,
    configurable: false,
  },
  {
    id: "internet",
    name: "Internet",
    tagline: "Webseiten lesen · YouTube · GitHub · Reddit · RSS",
    description:
      "Verxa kann Webseiten lesen, YouTube-Videos einordnen, öffentliche GitHub-Repos und Issues nachschlagen, Reddit-Threads lesen und RSS-Feeds abrufen — direkt aus dem Chat, ohne API-Key. Inspiriert von agent-reach, als Server-Tools für Vercel neu gebaut.",
    icon: "globe",
    category: "dev",
    authType: "api_key",
    permissions: ["Fetches public web content on request (no login, no private data)"],
    tools: [
      { id: "read_url", name: "Read web page", description: "Read any public web page as clean text." },
      { id: "youtube", name: "YouTube info", description: "Get title/author for a YouTube video." },
      { id: "github", name: "GitHub lookup", description: "Repo info, open issues, or repo search." },
      { id: "reddit", name: "Reddit thread", description: "Read a public Reddit post with top comments." },
      { id: "rss", name: "RSS feed", description: "Fetch the latest entries of any RSS/Atom feed." },
    ],
    enabled: true,
    configurable: false,
  },
];

export function getIntegration(id: string): IntegrationDef | undefined {
  return INTEGRATIONS.find((i) => i.id === id);
}
