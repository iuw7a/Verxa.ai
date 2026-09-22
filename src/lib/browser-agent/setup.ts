import "server-only";

import type { BrowserSession } from "@/lib/browser-agent/browser";

export type BrowserReadiness =
  | { ok: true }
  | { ok: false; error: string };

const TAIL = 400;

function tail(s: string | undefined | null): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  return t.length > TAIL ? `…${t.slice(-TAIL)}` : t;
}

type CmdOut = { stdout: string; stderr: string };

/**
 * Ensures the browser-use stack exists in the sandbox (idempotent):
 * Playwright + Chromium (with container-friendly launch flags handled by
 * the runners) AND the `browser-use` Python library that powers the agent.
 * Returns the REAL failure reason so the UI can show it.
 */
export async function ensurePlaywright(
  session: BrowserSession,
): Promise<BrowserReadiness> {
  // E2B's commands.run THROWS on non-zero exit — every probe tolerates it.
  const run = async (cmd: string, ms: number): Promise<CmdOut> => {
    try {
      const r = await session.sandbox.commands.run(cmd, { requestTimeoutMs: ms });
      return { stdout: String(r.stdout ?? ""), stderr: String(r.stderr ?? "") };
    } catch (e) {
      const err = e as { stdout?: unknown; stderr?: unknown };
      return {
        stdout: typeof err.stdout === "string" ? err.stdout : "",
        stderr:
          typeof err.stderr === "string"
            ? err.stderr
            : e instanceof Error
              ? e.message.slice(0, TAIL)
              : "command failed",
      };
    }
  };

  try {
    const checkPw = await run(
      "python3 -c \"import playwright; print('PLAYWRIGHT_OK')\"",
      20000,
    );
    if (!(checkPw.stdout ?? "").includes("PLAYWRIGHT_OK")) {
      const pip = await run("pip install --quiet playwright 2>&1 | tail -3", 180000);
      const verify = await run(
        "python3 -c \"import playwright; print('PLAYWRIGHT_OK')\"",
        20000,
      );
      if (!verify.stdout.includes("PLAYWRIGHT_OK")) {
        return {
          ok: false,
          error: `Could not install Playwright (pip): ${tail(pip.stdout) || tail(verify.stderr) || "no output"}`,
        };
      }
    }

    // System libraries for headless Chromium (needs sudo; best-effort).
    await run(
      "sudo -n python3 -m playwright install-deps chromium 2>&1 | tail -2",
      240000,
    );
    const checkBu = await run(
      "python3 -c \"import browser_use; print('BU_OK')\"",
      20000,
    );
    if (!checkBu.stdout.includes("BU_OK")) {
      const pipBu = await run("pip install --quiet browser-use 2>&1 | tail -3", 300000);
      const verifyBu = await run(
        "python3 -c \"import browser_use; print('BU_OK')\"",
        30000,
      );
      if (!verifyBu.stdout.includes("BU_OK")) {
        return {
          ok: false,
          error: `Could not install browser-use (pip): ${tail(pipBu.stdout) || tail(verifyBu.stderr) || "no output"}`,
        };
      }
    }

    const install = await run(
      "python3 -m playwright install chromium 2>&1 | tail -3",
      300000,
    );
    // Smoke test: real headless launch with the container flags the
    // runners use (--no-sandbox, --disable-dev-shm-usage).
    const launch = await run(
      "python3 -c \"from playwright.sync_api import sync_playwright\nwith sync_playwright() as p:\n    b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])\n    pg=b.new_page()\n    pg.goto('https://example.com',wait_until='domcontentloaded',timeout=20000)\n    b.close()\nprint('LAUNCH_OK')\"",
      120000,
    );
    if (!launch.stdout.includes("LAUNCH_OK")) {
      return {
        ok: false,
        error: `Chromium install/launch failed: ${tail(launch.stderr) || tail(launch.stdout) || tail(install.stdout) || "no output"}`,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: `Browser setup crashed: ${e instanceof Error ? e.message.slice(0, TAIL) : "unknown error"}`,
    };
  }
}
