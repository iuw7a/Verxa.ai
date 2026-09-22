/**
 * Verxa Code — Phase 1 shared types (strict, end-to-end typed).
 * Supabase is the persistence layer (Postgres + Auth + RLS).
 */

export type CodeProjectStatus = "draft" | "building" | "ready" | "error";

export type CodeProject = {
  id: string;
  title: string;
  prompt: string;
  status: CodeProjectStatus;
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectInput = {
  prompt: string;
};

export function parseCreateProjectInput(body: unknown): { ok: true; prompt: string } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Request body must be an object." };
  const prompt = (body as Record<string, unknown>).prompt;
  if (typeof prompt !== "string" || prompt.trim().length < 3) {
    return { ok: false, error: "Prompt must be at least 3 characters." };
  }
  if (prompt.length > 4000) {
    return { ok: false, error: "Prompt must be at most 4000 characters." };
  }
  return { ok: true, prompt: prompt.trim() };
}

export type CodeMessageRole = "user" | "assistant" | "tool";

export type CodeMessage = {
  id: string;
  role: CodeMessageRole;
  content: string;
  createdAt: string;
};

export function parseCodeMessageInput(body: unknown): { ok: true; content: string } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Request body must be an object." };
  const content = (body as Record<string, unknown>).content;
  if (typeof content !== "string" || content.trim().length < 1) {
    return { ok: false, error: "Message must not be empty." };
  }
  if (content.length > 4000) {
    return { ok: false, error: "Message must be at most 4000 characters." };
  }
  return { ok: true, content: content.trim() };
}

export function titleFromCodePrompt(prompt: string): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (!clean) return "Untitled project";
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}
