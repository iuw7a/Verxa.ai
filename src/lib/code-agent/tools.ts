import { execFile } from "child_process";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runCommandInSandbox, sandboxEnabled } from "./sandbox";

/**
 * Verxa Code agent tools (Phase 2.3 + 4.1 + E2B).
 * Files live in `verxa_code_files` (source of truth). run_command executes
 * in a real E2B cloud sandbox when E2B_API_KEY is set; otherwise it falls
 * back to a per-project local temp sandbox with timeout and allowlist.
 */

export const TOOL_DEFS = [
  {
    type: "function" as const,
    function: {
      name: "list_files",
      description: "List all files currently in the project. Returns a JSON array of paths.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Read a file from the project. Returns its full content.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Project-relative path, e.g. index.html" } },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description:
        "Create or overwrite a file in the project. Default target is a Next.js App Router structure (app/page.tsx, app/layout.tsx, app/globals.css, components/*.tsx, lib/utils.ts, package.json, tsconfig.json, next.config.ts, README.md). Static fallback: index.html + styles.css + app.js. Content must be complete — never truncated. Never write real secrets — use .env.example.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Project-relative path, e.g. index.html or styles.css" },
          content: { type: "string", description: "Complete file content" },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_command",
      description:
        "Run a single check command (node --version, npm --version, node -e \"...\") in the project sandbox. Simple commands only, no shell operators, no file deletion.",
      parameters: {
        type: "object",
        properties: { command: { type: "string", description: "Command to run, e.g. node --version" } },
        required: ["command"],
        additionalProperties: false,
      },
    },
  },
];

export type ToolResult = {
  ok: boolean;
  output: string;
  durationMs: number;
  /** Set for write_file so the caller can persist diffs + emit panel events. */
  file?: { path: string; previousContent: string | null };
};

function cleanPath(raw: unknown): { ok: true; path: string } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "path must be a non-empty string." };
  const p = raw.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!p || p.length > 200) return { ok: false, error: "Invalid path." };
  const segs = p.split("/");
  if (segs.some((s) => s === "" || s === "." || s === "..")) {
    return { ok: false, error: "Path must stay inside the project (no .. segments)." };
  }
  if (!/^[A-Za-z0-9._\-/]+$/.test(p)) return { ok: false, error: "Path contains unsupported characters." };
  return { ok: true, path: p };
}

async function listFiles(db: SupabaseClient, projectId: string): Promise<ToolResult> {
  const t0 = Date.now();
  const { data, error } = await db
    .from("verxa_code_files")
    .select("path")
    .eq("project_id", projectId)
    .order("path");
  if (error) return { ok: false, output: `list_files failed: ${error.message}`, durationMs: Date.now() - t0 };
  const paths = ((data ?? []) as { path: string }[]).map((r) => r.path);
  return { ok: true, output: JSON.stringify(paths), durationMs: Date.now() - t0 };
}

async function readFile(db: SupabaseClient, projectId: string, rawPath: unknown): Promise<ToolResult> {
  const t0 = Date.now();
  const checked = cleanPath(rawPath);
  if (!checked.ok) return { ok: false, output: checked.error, durationMs: Date.now() - t0 };
  const { data, error } = await db
    .from("verxa_code_files")
    .select("content")
    .eq("project_id", projectId)
    .eq("path", checked.path)
    .maybeSingle();
  if (error) return { ok: false, output: `read_file failed: ${error.message}`, durationMs: Date.now() - t0 };
  if (!data) return { ok: false, output: `File not found: ${checked.path}`, durationMs: Date.now() - t0 };
  const content = (data as { content: string }).content;
  const truncated = content.length > 30000 ? content.slice(0, 30000) + "\n…[truncated]" : content;
  return { ok: true, output: truncated, durationMs: Date.now() - t0 };
}

async function writeFile(
  db: SupabaseClient,
  projectId: string,
  rawPath: unknown,
  rawContent: unknown,
): Promise<ToolResult> {
  const t0 = Date.now();
  const checked = cleanPath(rawPath);
  if (!checked.ok) return { ok: false, output: checked.error, durationMs: Date.now() - t0 };
  if (typeof rawContent !== "string") return { ok: false, output: "content must be a string.", durationMs: Date.now() - t0 };
  if (rawContent.length > 200000) return { ok: false, output: "content exceeds 200KB.", durationMs: Date.now() - t0 };

  const { data: existing } = await db
    .from("verxa_code_files")
    .select("content")
    .eq("project_id", projectId)
    .eq("path", checked.path)
    .maybeSingle();

  const previousContent = existing ? (existing as { content: string }).content : null;
  const { error } = await db.from("verxa_code_files").upsert(
    {
      project_id: projectId,
      path: checked.path,
      content: rawContent,
      previous_content: previousContent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id,path" },
  );
  if (error) return { ok: false, output: `write_file failed: ${error.message}`, durationMs: Date.now() - t0 };
  return {
    ok: true,
    output: `Wrote ${checked.path} (${rawContent.length} chars).`,
    durationMs: Date.now() - t0,
    file: { path: changedPath(checked.path), previousContent },
  };
}

function changedPath(p: string) {
  return p;
}

const ALLOWED_BINARIES = new Set(["node", "npm", "npx"]);
const BLOCKED_TOKENS = [";", "&&", "||", "|", "`", "$(", ">", "<", "&", "\n", "\r", "..", "~"];

async function runOnce(sandboxDir: string, binary: string, args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    execFile(binary, args, { cwd: sandboxDir, timeout: 30000, maxBuffer: 20 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      const out = `${stdout ?? ""}${stderr ?? ""}`.slice(0, 4000);
      if (err) {
        const code = typeof (err as { code?: unknown }).code === "number" ? (err.code as number) : 1;
        resolve({ code, out: out || String(err.message).slice(0, 500) });
      } else {
        resolve({ code: 0, out: out || "(no output)" });
      }
    });
  });
}

/** Phase 4.1: retry loop — non-zero exits are retried automatically (max 3). */
async function runCommand(
  db: SupabaseClient,
  projectId: string,
  rawCommand: unknown,
): Promise<ToolResult> {
  const t0 = Date.now();
  if (typeof rawCommand !== "string" || !rawCommand.trim()) {
    return { ok: false, output: "command must be a non-empty string.", durationMs: Date.now() - t0 };
  }
  const command = rawCommand.trim();
  if (command.length > 500) return { ok: false, output: "command too long.", durationMs: Date.now() - t0 };
  if (BLOCKED_TOKENS.some((t) => command.includes(t))) {
    return { ok: false, output: "Blocked: only single simple commands without shell operators.", durationMs: Date.now() - t0 };
  }
  const parts = command.split(/\s+/);
  const binary = parts[0].toLowerCase();
  if (!ALLOWED_BINARIES.has(binary)) {
    return { ok: false, output: `Blocked: only ${[...ALLOWED_BINARIES].join(", ")} are allowed.`, durationMs: Date.now() - t0 };
  }

  // Preferred runtime: real E2B cloud sandbox (Linux, network, real node).
  if (sandboxEnabled()) {
    const res = await runCommandInSandbox(db, projectId, command);
    if (res) {
      return { ok: res.code === 0, output: res.out, durationMs: Date.now() - t0 };
    }
  }

  // Seed sandbox with current project files so checks run against real state.
  const sandboxDir = join(tmpdir(), "verxa-code", projectId);
  try {
    await fs.mkdir(sandboxDir, { recursive: true });
    const { data } = await db.from("verxa_code_files").select("path,content").eq("project_id", projectId);
    for (const row of ((data ?? []) as { path: string; content: string }[])) {
      const checked = cleanPath(row.path);
      if (!checked.ok) continue;
      const full = join(sandboxDir, checked.path);
      if (!full.startsWith(sandboxDir)) continue;
      await fs.mkdir(join(full, ".."), { recursive: true });
      await fs.writeFile(full, row.content);
    }
  } catch (e) {
    return { ok: false, output: `Sandbox setup failed: ${e instanceof Error ? e.message : "unknown"}`, durationMs: Date.now() - t0 };
  }

  let last = { code: 1, out: "" };
  for (let attempt = 1; attempt <= 3; attempt++) {
    last = await runOnce(sandboxDir, parts[0], parts.slice(1));
    if (last.code === 0) {
      return { ok: true, output: last.out, durationMs: Date.now() - t0 };
    }
  }
  return { ok: false, output: `Command failed after 3 attempts (exit ${last.code}):\n${last.out}`, durationMs: Date.now() - t0 };
}

export async function executeTool(
  db: SupabaseClient,
  projectId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case "list_files":
      return listFiles(db, projectId);
    case "read_file":
      return readFile(db, projectId, args.path);
    case "write_file":
      return writeFile(db, projectId, args.path, args.content);
    case "run_command":
      return runCommand(db, projectId, args.command);
    default:
      return { ok: false, output: `Unknown tool: ${name}`, durationMs: 0 };
  }
}
