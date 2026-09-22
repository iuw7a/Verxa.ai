import { Sandbox } from "e2b";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * E2B cloud sandbox for Verxa Code (preview runtime).
 *
 * Flow: the agent writes project files into Supabase (source of truth).
 * When it is done, `syncProjectToSandbox` uploads every file into a fresh
 * E2B sandbox, installs dependencies, starts a dev/static server in the
 * background and returns a public live URL for the preview iframe.
 */

const SANDBOX_TIMEOUT_MS = 15 * 60 * 1000; // free tier caps at 1h; keep it modest
const PREVIEW_PORT = 3000;

export function sandboxEnabled(): boolean {
  return Boolean(process.env.E2B_API_KEY?.trim());
}

async function loadProjectFiles(db: SupabaseClient, projectId: string): Promise<{ path: string; content: string }[]> {
  const { data, error } = await db.from("verxa_code_files").select("path,content").eq("project_id", projectId);
  if (error) throw new Error(`Could not load project files: ${error.message}`);
  return ((data ?? []) as { path: string; content: string }[]).filter(
    (f) => !/(^|\/)\.env(\.|$)/.test(f.path), // secrets never enter the sandbox
  );
}

function isNextProject(files: { path: string; content?: string }[]): boolean {
  return (
    files.some((f) => f.path === "package.json" && /"next"/.test(f.content ?? "")) ||
    files.some((f) => f.path === "app/page.tsx")
  );
}

/** Poll the sandbox URL until the server answers (or time out silently). */
async function waitForServer(url: string, attempts = 20): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/**
 * Uploads all project files into a fresh E2B sandbox and starts a server.
 * Returns a public URL (https) or null when E2B is not configured / fails —
 * callers must gracefully fall back to the static file preview.
 */
export async function syncProjectToSandbox(
  db: SupabaseClient,
  projectId: string,
  opts?: { signal?: AbortSignal },
): Promise<{ url: string } | { error: string } | null> {
  if (!sandboxEnabled()) return null;

  let sandbox: Sandbox | null = null;
  try {
    const files = await loadProjectFiles(db, projectId);
    if (files.length === 0) return null;

    sandbox = await Sandbox.create({
      timeoutMs: SANDBOX_TIMEOUT_MS,
      metadata: { projectId, app: "verxa-code" },
    });

    if (opts?.signal?.aborted) {
      await sandbox.kill();
      return null;
    }

    // Upload every project file.
    for (const f of files) {
      try {
        await sandbox.files.write(`/home/user/project/${f.path}`, f.content);
      } catch (e) {
        return { error: `Sandbox upload failed for ${f.path}: ${e instanceof Error ? e.message : "unknown"}` };
      }
    }

    if (isNextProject(files)) {
      // Real Next.js app: install deps, start dev server in background.
      await sandbox.commands.run("npm install --no-audit --no-fund", { cwd: "/home/user/project", requestTimeoutMs: 240000 });
      await sandbox.commands.run(`npx next dev --port ${PREVIEW_PORT} --hostname 0.0.0.0`, {
        cwd: "/home/user/project",
        background: true,
      });
    } else {
      // Static file set: plain HTTP server, no installs needed.
      await sandbox.commands.run(`python3 -m http.server ${PREVIEW_PORT} --bind 0.0.0.0`, {
        cwd: "/home/user/project",
        background: true,
      });
    }

    const host = sandbox.getHost(PREVIEW_PORT);
    const url = `https://${host}`;
    const up = await waitForServer(url);
    if (!up) return { error: "Sandbox server did not come up in time." };
    return { url };
  } catch (e) {
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch {
        /* cleanup best-effort */
      }
    }
    console.error("[code-sandbox] failed:", e instanceof Error ? e.message : String(e));
    return { error: e instanceof Error ? e.message : "Sandbox failed." };
  }
}

/**
 * Runs a single command inside a throwaway E2B sandbox seeded with the
 * current project files. Used by the agent's run_command tool so checks
 * (node/npm) run in a real Linux environment with network access.
 */
export async function runCommandInSandbox(
  db: SupabaseClient,
  projectId: string,
  command: string,
): Promise<{ code: number; out: string } | null> {
  if (!sandboxEnabled()) return null;

  let sandbox: Sandbox | null = null;
  try {
    const files = await loadProjectFiles(db, projectId);
    sandbox = await Sandbox.create({
      timeoutMs: 5 * 60 * 1000,
      metadata: { projectId, app: "verxa-code", kind: "tool" },
    });

    for (const f of files) {
      await sandbox.files.write(`/home/user/project/${f.path}`, f.content);
    }

    const result = await sandbox.commands.run(command, { cwd: "/home/user/project", requestTimeoutMs: 30000 });
    return { code: result.exitCode, out: `${result.stdout}${result.stderr}`.slice(0, 4000) || "(no output)" };
  } catch (e) {
    return { code: 1, out: `Sandbox command failed: ${e instanceof Error ? e.message : "unknown"}`.slice(0, 1000) };
  } finally {
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch {
        /* cleanup best-effort */
      }
    }
  }
}