import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";
import { Sandbox } from "e2b";

import type { BrowserSession } from "@/lib/browser-agent/browser";
import { ensurePlaywright } from "@/lib/browser-agent/setup";

/** Creates one browser session (one E2B sandbox + runner upload + Playwright). */
export async function createBrowserSession(
  timeoutMs = 10 * 60 * 1000,
): Promise<BrowserSession> {
  const sandbox = await Sandbox.create({
    timeoutMs,
    metadata: { app: "verxa-browser-agent" },
  });
  try {
    const runner = await readFile(join(process.cwd(), "src/lib/browser-agent/files/runner.py"), "utf8");
    await sandbox.files.write("/home/user/agent_runner.py", runner);
    const buRunner = await readFile(join(process.cwd(), "src/lib/browser-agent/files/bu_runner.py"), "utf8");
    await sandbox.files.write("/home/user/bu_agent_runner.py", buRunner);
  } catch {
    /* upload failure surfaces as ready=false below */
  }
  const session: BrowserSession = { sandbox, ready: false };
  const readiness = await ensurePlaywright(session);
  session.ready = readiness.ok;
  if (!readiness.ok) session.readyError = readiness.error;
  return session;
}

/** Kills the sandbox (best-effort). */
export async function closeBrowserSession(session: BrowserSession): Promise<void> {
  try {
    await session.sandbox.kill();
  } catch {
    /* cleanup best-effort */
  }
}
